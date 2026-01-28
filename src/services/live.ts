import { fetchEmbeddedData } from '@/nico'
import { NicoliveMessageSchema } from '@/proto/dwango/nicolive/chat/data/message_pb'
import { NicoliveStateSchema } from '@/proto/dwango/nicolive/chat/data/state_pb'
import { sendStartWatching, webSocketRequest } from '@/websocket'
import { WebSocketResponse } from '@/websocket.types'
import { JsonValue, toJson } from '@bufbuild/protobuf'
import { DurableObject } from 'cloudflare:workers'
import { MessageDO } from './message'
import { messagesFromBinaries } from './segment'

export abstract class LiveDO<Env = any> extends DurableObject<Env> {
  private ws?: WebSocket
  private keepIntervalSec: number = 30

  abstract messageService: DurableObjectNamespace<MessageDO>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }

  async fetch() {
    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server)
    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async send(...messages: Uint8Array[]) {
    const payloads = messagesFromBinaries(messages).reduce(
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
    this.ctx.getWebSockets().forEach((ws) => ws.send(data))
  }

  async #keepSeatAlarm(keepIntervalSec: number = this.keepIntervalSec) {
    const now = Date.now()
    const interval = keepIntervalSec * 1000
    await this.ctx.storage.setAlarm(now + interval)
  }

  async alarm() {
    if (!this.ws) return
    // send keepSeat message
    webSocketRequest(this.ws, { type: 'keepSeat' })
    // set next alarm
    await this.#keepSeatAlarm()
  }

  // init()は必ず実行される前提
  async init(liveId: string): Promise<void> {
    console.log('[LiveDO] attempt live init')
    // WebSocket接続が存在すれば終了
    if (this.ws) {
      console.log('[LiveDO] already exists ws session')
      return
    }

    // ライブの情報を取得
    const live = await fetchEmbeddedData(liveId)
    // ライブの状態を確認
    if (live.program.status === 'ENDED') {
      throw new Error('live is ended')
    }

    // WebSocketサーバに接続
    const { webSocketUrl } = live.site.relive
    this.ws = new WebSocket(webSocketUrl)
    // on open
    this.ws.addEventListener('open', () => {
      sendStartWatching(this.ws!) // startWatchingメッセージを送信
    })
    this.ws.addEventListener('close', (e) => {
      const clients = this.ctx.getWebSockets()
      clients.forEach((ws) => ws.close(e.code, e.reason))
    })
    // on message
    this.ws.addEventListener('message', async (e) => {
      const res: WebSocketResponse = JSON.parse(e.data)
      switch (res.type) {
        /**
         * 即座にpongを返す
         */
        case 'ping': {
          webSocketRequest(this.ws!, { type: 'pong' })
          break
        }

        /**
         * keepIntervalSecの間隔でkeepSeatを送信する
         * Alarm APIで定期的に実行
         */
        case 'seat': {
          this.keepIntervalSec = res.data.keepIntervalSec
          await this.#keepSeatAlarm(this.keepIntervalSec)
          break
        }

        /**
         * MessageDOを起動する
         */
        case 'messageServer': {
          const { viewUri } = res.data
          const stub = this.messageService.getByName(liveId)
          await stub.launch(liveId, viewUri)
          break
        }

        case 'disconnect': {
          const { reason } = res.data
          console.log('[LiveDO] disconnected', { reason })

          // MessageDOに終了を通知
          const stub = this.messageService.getByName(liveId)
          await stub.setEnd()

          break
        }

        default: {
          break
        }
      }
    })
  }
}
