import { fetchEmbeddedData } from '@/nico'
import { ChatSchema } from '@/proto/dwango/nicolive/chat/data/atoms_pb'
import { NicoliveMessageSchema } from '@/proto/dwango/nicolive/chat/data/message_pb'
import { NicoliveStateSchema } from '@/proto/dwango/nicolive/chat/data/state_pb'
import { ChunkedMessage } from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { sendStartWatching, webSocketRequest } from '@/websocket'
import { WebSocketResponse } from '@/websocket.types'
import { JsonValue, toJson, toJsonString } from '@bufbuild/protobuf'
import { getLogger } from '@logtape/logtape'
import { DurableObject } from 'cloudflare:workers'
import { MessageDO } from './message'
import { messagesFromBinaries } from './segment'

const logger = getLogger(['live', 'do'])

const isChat = (
  v: ChunkedMessage,
): v is ChunkedMessage & {
  payload: {
    case: 'message'
    value: { data: { case: 'chat' | 'overflowedChat' } }
  }
} =>
  v.payload.case === 'message' &&
  (v.payload.value.data.case === 'chat' ||
    v.payload.value.data.case === 'overflowedChat')

export abstract class LiveDO<Env = any> extends DurableObject<Env> {
  private ws?: WebSocket
  private keepIntervalSec: number = 30

  abstract messageService: DurableObjectNamespace<MessageDO>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)

    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        -- dwango.nicolive.chat.data.Chat
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          body JSON NOT NULL,
          -- virtual columns
          no INTEGER NOT NULL
            AS (json_extract(body, '$.no')),
          vpos INTEGER NOT NULL
            AS (json_extract(body, '$.vpos')),
          raw_user_id INTEGER
            AS (json_extract(body, '$.rawUserId')),
          hashed_user_id INTEGER
            AS (json_extract(body, '$.hashedUserId'))
        );
        CREATE INDEX IF NOT EXISTS idx_chats_no ON chats(no);
        CREATE INDEX IF NOT EXISTS idx_chats_vpos ON chats(vpos);
        CREATE INDEX IF NOT EXISTS idx_chats_raw_user_id ON chats(raw_user_id);
        CREATE INDEX IF NOT EXISTS idx_chats_hashed_user_id ON chats(hashed_user_id);
      `)
    })
  }

  async fetch() {
    logger.debug('attempt websocket connection request')

    try {
      const [client, server] = Object.values(new WebSocketPair())
      this.ctx.acceptWebSocket(server)

      logger.info('websocket connection established', {
        count: this.ctx.getWebSockets().length,
      })

      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    } catch (error) {
      logger.error('websocket established error', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async send(...messages: Uint8Array[]) {
    const l = logger.with({ messageCount: messages.length })
    l.debug('processing messages to send')

    try {
      const chunkedMessages = messagesFromBinaries(messages)
      this.ctx.waitUntil(this.#store(chunkedMessages))

      const payloads = chunkedMessages.reduce(
        (acc, { payload }) => {
          switch (payload.case) {
            case 'message': {
              acc.messages.push(toJson(NicoliveMessageSchema, payload.value))
              break
            }
            case 'state': {
              acc.states.push(toJson(NicoliveStateSchema, payload.value))
              break
            }
          }
          return acc
        },
        { messages: [], states: [] } as Record<
          'messages' | 'states',
          JsonValue[]
        >,
      )

      const data = JSON.stringify(payloads)
      const clients = this.ctx.getWebSockets()
      clients.forEach((ws) => ws.send(data))

      l.info('messages sent successfully', {
        clientCount: clients.length,
        payloads: {
          stateCount: payloads.states.length,
          messageCount: payloads.messages.length,
        },
      })
    } catch (error) {
      l.error('send messages error', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async #store(messages: ChunkedMessage[]) {
    messages
      .filter(isChat)
      .map((v) => [
        v.meta!.id,
        toJsonString(ChatSchema, v.payload.value.data.value),
      ])
      .forEach(([id, value]) => {
        this.ctx.storage.sql.exec(
          `INSERT INTO chats (id, body) VALUES (?,?);`,
          id,
          value,
        )
      })
  }

  async getChats(): Promise<Record<string, any>[]> {
    const query = `SELECT body FROM chats`
    const cursor = this.ctx.storage.sql.exec<{ body: string }>(query)
    return cursor.toArray().map((v) => JSON.parse(v.body))
  }

  async #keepSeatAlarm(keepIntervalSec: number = this.keepIntervalSec) {
    const now = Date.now()
    const durationMs = keepIntervalSec * 1000
    const alarmMs = now + durationMs
    await this.ctx.storage.setAlarm(alarmMs)

    logger.debug('set alarm', {
      durationMs,
      time: new Date(alarmMs).toISOString(),
    })
  }

  async alarm() {
    if (!this.ws) {
      logger.warn('alarm stopped - no websocket connection')
      return
    }

    try {
      webSocketRequest(this.ws, { type: 'keepSeat' })
      logger.debug('sent keepSeat')

      await this.#keepSeatAlarm()
    } catch (error) {
      logger.error('alarm execution error', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // init()は必ず実行される前提
  async launch(liveId: string): Promise<void> {
    const l = logger.with({ liveId })
    l.info('launching live do')

    if (this.ws) {
      l.info('websocket session already exists')
      return
    }

    try {
      l.debug('fetching live data')
      const live = await fetchEmbeddedData(liveId)

      if (live.program.status === 'ENDED') {
        l.error('live has ended')
        throw new Error('live has ended')
      }
      l.info('live data fetched')

      const { webSocketUrl } = live.site.relive
      l.debug('connecting to websocket server', { webSocketUrl })

      this.ws = new WebSocket(webSocketUrl)

      this.ws.addEventListener('open', () => {
        l.info('websocket connection opened')
        sendStartWatching(this.ws!)
        l.debug('startwatching message sent')
      })

      this.ws.addEventListener('close', ({ code, reason }) => {
        l.info('websocket connection closed', { code, reason })
        const clients = this.ctx.getWebSockets()
        clients.forEach((ws) => ws.close(code, reason))
      })

      this.ws.addEventListener('message', async (e) => {
        try {
          const res: WebSocketResponse = JSON.parse(e.data)

          switch (res.type) {
            /**
             * 即座にpongを返す
             */
            case 'ping': {
              l.debug('ping received - sending pong')
              webSocketRequest(this.ws!, { type: 'pong' })
              break
            }

            /**
             * keepIntervalSecの間隔でkeepSeatを送信する
             * Alarm APIで定期的に実行
             */
            case 'seat': {
              this.keepIntervalSec = res.data.keepIntervalSec
              l.info('seat inf oreceived', {
                keepIntervalSec: this.keepIntervalSec,
              })

              await this.#keepSeatAlarm(this.keepIntervalSec)
              break
            }

            /**
             * MessageDOを起動する
             */
            case 'messageServer': {
              const { viewUri } = res.data
              l.info('message server info received', { viewUri })

              const stub = this.messageService.getByName(liveId)
              await stub.launch(liveId, viewUri)
              l.info('message do launched')

              break
            }

            case 'disconnect': {
              const { reason } = res.data
              console.log('[LiveDO] disconnected', { reason })
              l.info('disconnect message received')

              const stub = this.messageService.getByName(liveId)
              await stub.setEnd()
              l.debug('message do notified of ended')

              break
            }

            default: {
              l.debug('unsupported message type', { type: res.type })
              break
            }
          }
        } catch (error) {
          l.error('websocket onmessage error', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      })

      l.info('launch live do completed')
    } catch (error) {
      l.error('launching live do error', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
