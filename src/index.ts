import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers'
import { fetchEmbeddedData } from './nico'
import { EmbeddedData } from './nico.types'
import { startWatching, webSocketRequest } from './websocket'
import { WebSocketResponse } from './websocket.types'

export class ChatService extends DurableObject {
  private status: 'initial' | 'connected' = 'initial'
  private live!: EmbeddedData
  private ws!: WebSocket

  async fetch(req: Request): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server)
    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async init(liveId: string): Promise<void> {
    if (this.status === 'connected') {
      return
    }

    this.live = await fetchEmbeddedData(liveId)
    if (this.live.program.status === 'ENDED') {
      throw new Error('live is ended')
    }

    const { webSocketUrl } = this.live.site.relive
    this.ws = new WebSocket(webSocketUrl)

    this.ws.addEventListener('open', () => {
      startWatching(this.ws)
    })

    this.ws.addEventListener('message', (e) => {
      const res: WebSocketResponse = JSON.parse(e.data)
      switch (res.type) {
        case 'messageServer': {
          const { viewUri, vposBaseTime } = res.data
          break
        }

        case 'seat': {
          // TODO: keepIntervalSec間隔で送信し続ける必要がある
          // webSocketRequest(this.ws, { type: 'keepSeat' })
          break
        }

        case 'ping': {
          webSocketRequest(this.ws, { type: 'pong' })
          break
        }

        default: {
          console.error('unsupported type', res)
          break
        }
      }
    })

    this.status = 'connected'
  }
}

export default class extends WorkerEntrypoint {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const pattern = [req.method.toUpperCase(), url.pathname].join(' ')

    switch (pattern) {
      case 'GET /ws': {
        const liveId = url.searchParams.get('id')
        if (!liveId) {
          return Response.json(
            { error: 'empty_params', keys: ['id'] },
            { status: 400 },
          )
        }

        const stub = this.env.CHAT_SERVICE.getByName(liveId)
        await stub.init(liveId)

        return stub.fetch(req)
      }

      default: {
        return Response.json({ error: 'not found' }, { status: 404 })
      }
    }
  }
}
