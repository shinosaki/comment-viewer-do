import { fetchMessage } from '@/ndgr'
import { ChunkedEntrySchema } from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { DurableObject } from 'cloudflare:workers'
import { SegmentDO } from './segment_do'

type LiveStatus = 'ON_AIR' | 'ENDED'

export abstract class MessageDO<Env = any> extends DurableObject<Env> {
  private status: LiveStatus = 'ON_AIR'
  private viewUri?: URL
  private nextAt?: number
  private liveId?: string // lv123
  private readonly processed = { uris: new Set<string>() }

  abstract segmentService: DurableObjectNamespace<SegmentDO>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }

  async setStatus(status: LiveStatus) {
    this.status = status
  }

  async init(liveId: string, viewUri: string) {
    this.liveId = liveId // alarmで必要

    this.viewUri = new URL(viewUri)
    this.viewUri.searchParams.set('at', 'now')

    await this.#handler(liveId, this.viewUri.toString())
    console.log('[MessageDO] handler finished in init')
    await this.ctx.storage.setAlarm(Date.now() + 1 * 1000)
  }

  async alarm(): Promise<void> {
    if (this.status === 'ENDED') {
      console.log('[MessageDO] deactivate alarm', { status: this.status })
      return
    }
    if (!this.viewUri || !this.nextAt || !this.liveId) return

    this.viewUri.searchParams.set('at', this.nextAt.toString())
    await this.#handler(this.liveId, this.viewUri.toString())
    console.log('[MessageDO] handler finished in alarm')
    await this.ctx.storage.setAlarm(Date.now() + 1 * 1000)
  }

  async #handler(liveId: string, uri: string) {
    if (this.processed.uris.has(uri)) return
    this.processed.uris.add(uri)

    console.log('[MessageDO] attempt "handler"', uri)
    const stream = await fetchMessage(ChunkedEntrySchema, uri)
    for await (const { entry } of stream) {
      switch (entry.case) {
        case 'next': {
          const { at } = entry.value
          this.nextAt = Number(at)
          continue
        }

        case 'backward': {
          const uri = entry.value.segment?.uri
          if (uri) {
            if (this.processed.uris.has(uri)) continue
            this.processed.uris.add(uri)

            const stub = this.segmentService.getByName(liveId)
            await stub.backward(liveId, uri)
          }
          continue
        }

        case 'previous':
        case 'segment': {
          const { uri } = entry.value

          if (this.processed.uris.has(uri)) continue
          this.processed.uris.add(uri)

          const stub = this.segmentService.getByName(liveId)
          await stub.segment(uri)
          continue
        }
      }
    }
  }
}
