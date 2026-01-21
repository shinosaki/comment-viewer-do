import { fetchMessage } from '@/ndgr'
import { ChunkedEntrySchema } from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { DurableObject } from 'cloudflare:workers'
import { SegmentDO } from './segment_do'

export abstract class MessageDO<Env = any> extends DurableObject<Env> {
  private viewUri?: URL
  private nextAt?: number

  abstract segmentService: DurableObjectNamespace<SegmentDO>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }

  async init(viewUri: string) {
    this.viewUri = new URL(viewUri)
    this.viewUri.searchParams.set('at', 'now')

    await this.#handler(this.viewUri.toString())

    // 1秒後 or nextAtのどちらか大きいほうを設定するほうがいいかも
    await this.ctx.storage.setAlarm(Date.now() + 1 * 1000)
  }

  async alarm(): Promise<void> {
    console.log('[MessageDO] attempt "alarm"', {
      at: this.nextAt,
      uri: this.viewUri?.toString(),
    })

    if (!this.viewUri || !this.nextAt) return

    this.viewUri.searchParams.set('at', this.nextAt.toString())
    await this.#handler(this.viewUri.toString())

    await this.ctx.storage.setAlarm(Date.now() + 1 * 1000)
  }

  async #handler(uri: string) {
    console.log('[MessageDO] attempt "handler"', uri)
    const stream = await fetchMessage(ChunkedEntrySchema, uri)
    for await (const { entry } of stream) {
      switch (entry.case) {
        case 'next': {
          const { at } = entry.value
          this.nextAt = Number(at)
          continue
        }

        /**
         * TODO
         * Backwardは同じURLが定期的送られてくるぽい？
         * 同じBackwardのURLを取得しないようにしたほうがいい
         *
         * いずれか（多分後者がいい）
         * - URLごとのSegmentDOインスタンスで取得済みかどうかを保持する
         * - LiveIDごとのSegmentDOインスタンスで、BackwardやSegmentなどの取得済みURLを保持し重複排除
         */
        case 'backward': {
          const uri = entry.value.segment?.uri
          if (uri) {
            const stub = this.segmentService.getByName(uri)
            await stub.backward(uri)
          }
          break
        }

        case 'previous':
        case 'segment': {
          const { uri } = entry.value
          const stub = this.segmentService.getByName(uri)
          await stub.segment(uri)
          break
        }
      }
    }
  }
}
