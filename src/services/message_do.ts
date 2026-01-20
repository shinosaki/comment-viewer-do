import { fetchStream, readMessage } from '@/ndgr'
import { ChunkedEntrySchema } from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { DurableObject } from 'cloudflare:workers'
import { SegmentDO } from './segment_do'

const isUnix = (v: number): boolean => {
  const { length } = atob.toString()
  return length === 10
}

export abstract class MessageDO<Env = any> extends DurableObject<Env> {
  private viewUri?: URL
  private nextAt?: number

  abstract segmentService: DurableObjectNamespace<SegmentDO>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }

  async init(viewUri: string) {
    // viewUriを代入
    this.viewUri = new URL(viewUri)
    this.viewUri.searchParams.set('at', 'now')

    // ハンドラーを実行
    await this.handler(this.viewUri)

    // 1秒後にalarmを実行
    // 1秒後 or nextAtのどちらか大きいほうを設定するほうがいいかも
    await this.ctx.storage.setAlarm(Date.now() + 1 * 1000)
  }

  async alarm(): Promise<void> {
    if (!this.viewUri || !this.nextAt) return
    // atをthis.nextAtで置き換える
    this.viewUri.searchParams.set('at', this.nextAt.toString())
    await this.handler(this.viewUri)
    await this.ctx.storage.setAlarm(Date.now() + 1 * 1000)
  }

  async handler(uri: URL) {
    console.log('[MessageDO] attempt handle:', { uri: uri.toString() })
    const reader = await fetchStream(uri)
    for await (const { entry } of readMessage(ChunkedEntrySchema, reader)) {
      switch (entry.case) {
        // ReadyForNext.atを取得したらthis.nextAtに代入
        case 'next': {
          const { at } = entry.value
          this.nextAt = Number(at)
          continue
        }

        // SegmentDOを起動する
        case 'segment': {
          const { uri } = entry.value
          const stub = this.segmentService.getByName(uri)
          await stub.init(uri)
          break
        }

        case 'backward':
        case 'previous': {
          const {} = entry.value
          break
        }
      }
    }
  }
}
