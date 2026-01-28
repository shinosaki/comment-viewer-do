import { fetchMessage } from '@/ndgr'
import { ChunkedEntrySchema } from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { DurableObject } from 'cloudflare:workers'
import { LiveDO } from './live'
import { SegmentWorker } from './segment'

export abstract class MessageDO<Env = any> extends DurableObject<Env> {
  private isEnded: boolean = false
  private liveId?: string // lv123
  private viewUri?: URL
  private nextAt?: number
  private readonly uris = new Set<string>()

  abstract segmentService: Service<SegmentWorker>
  abstract liveService: DurableObjectNamespace<LiveDO>

  async setEnd(): Promise<void> {
    this.isEnded = true
  }

  async launch(liveId: string, viewUri: string): Promise<void> {
    this.liveId = liveId
    this.viewUri = new URL(viewUri)
    this.viewUri.searchParams.set('at', 'now')
    console.log('Launch MessageDO', { liveId, uri: this.viewUri.toString() })

    await this.#setAlarm()
  }

  async alarm(): Promise<void> {
    if (this.isEnded) {
      console.log('Stop alarm', { reason: 'ended live' })
      return
    }
    if (!this.liveId || !this.viewUri) {
      console.error('Stop alarm', { reason: 'undefined liveId or viewUri' })
      return
    }

    const at = this.nextAt?.toString() ?? 'now'
    this.viewUri.searchParams.set('at', at)
    await this.#entry(this.viewUri.toString())

    await this.#setAlarm()
  }

  async #entry(uri: string): Promise<void> {
    const stream = await fetchMessage(ChunkedEntrySchema, uri)
    for await (const { entry } of stream) {
      SWITCH: switch (entry.case) {
        case 'next': {
          const { at } = entry.value
          this.nextAt = Number(at)
          break SWITCH
        }

        case 'segment':
        case 'previous': {
          const { uri } = entry.value
          if (!this.uris.has(uri)) {
            this.uris.add(uri)
            const messages = await this.segmentService.chunked(uri)
            this.ctx.waitUntil(this.#send(messages))
          }
          break SWITCH
        }

        case 'backward': {
          const uri = entry.value.segment?.uri
          if (uri) {
            await this.#backward(uri)
          }
          break SWITCH
        }
      }
    }
  }

  async #backward(uri: string): Promise<void> {
    if (!this.uris.has(uri)) {
      this.uris.add(uri)

      const { next, messages } = await this.segmentService.packed(uri)
      this.ctx.waitUntil(this.#send(messages))

      if (next) {
        this.ctx.waitUntil(this.#backward(next))
      }
    }
  }

  async #send(messages: Uint8Array[]) {
    if (this.liveId) {
      const stub = this.liveService.getByName(this.liveId)
      await stub.send(...messages)
    }
  }

  async #setAlarm(durationMs: number = 1000): Promise<void> {
    const now = Date.now()
    await this.ctx.storage.setAlarm(now + durationMs)
  }
}
