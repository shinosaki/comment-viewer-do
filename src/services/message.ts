import { fetchMessage } from '@/ndgr'
import { ChunkedEntrySchema } from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { getLogger } from '@logtape/logtape'
import { DurableObject } from 'cloudflare:workers'
import { LiveDO } from './live'
import { SegmentWorker } from './segment'

const logger = getLogger(['message', 'do'])

export abstract class MessageDO<Env = any> extends DurableObject<Env> {
  private isEnded: boolean = false
  private liveId?: string // lv123
  private viewUri?: URL
  private nextAt?: number
  private readonly uris = new Set<string>()

  abstract segmentService: Service<SegmentWorker>
  abstract liveService: DurableObjectNamespace<LiveDO>

  async setEnd(): Promise<void> {
    logger.info('set ending message do', { liveId: this.liveId })
    this.isEnded = true
  }

  async launch(liveId: string, viewUri: string): Promise<void> {
    this.liveId = liveId
    this.viewUri = new URL(viewUri)
    this.viewUri.searchParams.set('at', 'now')
    logger.info('launching message do', {
      liveId,
      viewUri: this.viewUri.toString(),
    })

    await this.#setAlarm()
  }

  async alarm(): Promise<void> {
    const l = logger.with({ liveId: this.liveId })

    if (this.isEnded) {
      l.info('alarm stopped - lilve ended')
      return
    }
    if (!this.liveId || !this.viewUri) {
      l.error('alarm stopped - missing required data', {
        hasViewUri: !!this.viewUri,
      })
      return
    }

    const at = this.nextAt?.toString() ?? 'now'
    this.viewUri.searchParams.set('at', at)
    l.debug('alarm triggered', { at, viewUri: this.viewUri.toString() })

    try {
      await this.#entry(this.viewUri.toString())
      await this.#setAlarm()
    } catch (error) {
      l.error('alarm execution error', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async #entry(uri: string): Promise<void> {
    const l = logger.with({ liveId: this.liveId })
    l.debug('processing entry', { uri })

    try {
      const stream = await fetchMessage(ChunkedEntrySchema, uri)

      let entryCount = 0
      for await (const { entry } of stream) {
        entryCount++

        SWITCH: switch (entry.case) {
          case 'next': {
            const { at } = entry.value
            this.nextAt = Number(at)
            l.debug('next entry scheduled', { at: this.nextAt })
            break SWITCH
          }

          case 'segment':
          case 'previous': {
            const { uri } = entry.value
            if (!this.uris.has(uri)) {
              this.uris.add(uri)

              l.debug('processing segment', { type: entry.case, uri })
              const messages = await this.segmentService.chunked(uri)
              l.info('chunked message fetched', { uri, count: messages.length })

              this.ctx.waitUntil(this.#send(messages))
            } else {
              l.debug('skipping duplicate segment', {
                type: entry.case,
                uri,
              })
            }
            break SWITCH
          }

          case 'backward': {
            const uri = entry.value.segment?.uri
            if (uri) {
              l.debug('processing backward', { uri })
              await this.#backward(uri)
            } else {
              l.warn('backward entry missing segment uri')
            }
            break SWITCH
          }
        }
      }

      l.info('entry processing completed', {
        uri,
        entryCount,
        uris: this.uris.size,
      })
    } catch (error) {
      l.error('entry processing failed', {
        uri,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async #backward(uri: string): Promise<void> {
    const l = logger.with({ liveId: this.liveId })

    if (!this.uris.has(uri)) {
      this.uris.add(uri)
      l.debug('processing backward segment', { uri, uris: this.uris.size })

      try {
        const { next, messages } = await this.segmentService.packed(uri)
        l.info('packed segment fetched', { uri, count: messages.length })

        this.ctx.waitUntil(this.#send(messages))

        if (next) {
          l.debug('next backward processing', { current: uri, next })
          this.ctx.waitUntil(this.#backward(next))
        } else {
          l.info('complete backward', { finalUri: uri })
        }
      } catch (error) {
        l.error('backward processing error', {
          uri,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    } else {
      l.debug('skipping duplicate backward segment', { uri })
    }
  }

  async #send(messages: Uint8Array[]) {
    const l = logger.with({ liveId: this.liveId })

    if (this.liveId) {
      l.debug('sending messages to live do', { count: messages.length })

      try {
        const stub = this.liveService.getByName(this.liveId)
        await stub.send(...messages)
        logger.debug('messages sent successfully', { count: messages.length })
      } catch (error) {
        l.error('failed to send messages', {
          count: messages.length,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    } else {
      l.warn('cannot send messages - no liveId set')
    }
  }

  async #setAlarm(durationMs: number = 1000): Promise<void> {
    const now = Date.now()
    const alarmMs = now + durationMs
    await this.ctx.storage.setAlarm(alarmMs)

    logger.debug('set alarm', {
      liveId: this.liveId,
      durationMs,
      time: new Date(alarmMs).toISOString(),
    })
  }
}
