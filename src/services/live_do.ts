import { fetchEmbeddedData } from '@/nico'
import { EmbeddedData } from '@/nico.types'
import { startWatching, webSocketRequest } from '@/websocket'
import { WebSocketResponse } from '@/websocket.types'
import { DurableObject } from 'cloudflare:workers'
import { MessageDO } from './message_do'

export abstract class LiveDO<Env = any> extends DurableObject<Env> {
  private status: 'init' | 'connected' | 'finished' = 'init'
  private live!: EmbeddedData
  private ws!: WebSocket
  private keepIntervalSec: number = 30

  abstract messageService: DurableObjectNamespace<MessageDO>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }

  async fetch(req: Request) {
    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server)
    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async #keepSeatAlarm(keepIntervalSec: number = this.keepIntervalSec) {
    const now = Date.now()
    const interval = keepIntervalSec * 1000
    await this.ctx.storage.setAlarm(now + interval)
  }

  async alarm() {
    // send keepSeat message
    webSocketRequest(this.ws, { type: 'keepSeat' })
    // set next alarm
    await this.#keepSeatAlarm()
  }

  // init()は必ず実行される前提
  async init(liveId: string): Promise<void> {
    // WebSocketサーバへの多重接続を防ぐ
    if (this.status === 'connected') return

    // ライブの情報を取得
    this.live = await fetchEmbeddedData(liveId)
    // ライブの状態を確認
    if (this.live.program.status === 'ENDED') {
      throw new Error('live is ended')
    }

    // WebSocketサーバに接続
    const { webSocketUrl } = this.live.site.relive
    this.ws = new WebSocket(webSocketUrl)
    // on open
    this.ws.addEventListener('open', () => {
      this.status = 'connected'
      startWatching(this.ws) // startWatchingメッセージを送信
    })
    // on close
    this.ws.addEventListener('close', () => {
      this.status = 'finished'
    })
    // on message
    this.ws.addEventListener('message', async (e) => {
      const res: WebSocketResponse = JSON.parse(e.data)
      switch (res.type) {
        /**
         * 即座にpongを返す
         */
        case 'ping': {
          webSocketRequest(this.ws, { type: 'pong' })
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
          const stub = this.messageService.getByName(viewUri)
          await stub.init(viewUri)
          break
        }

        default: {
          console.error('unsupported type', res.type)
          break
        }
      }
    })
  }

  async storeMessage(id: string, json: string) {
    // WebSocketクライアントにブロードキャスト
    const clients = this.ctx.getWebSockets()
    clients.forEach((c) => c.send(json))
  }
}
