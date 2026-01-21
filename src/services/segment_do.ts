import { fetchMessage } from '@/ndgr'
import { ProgramStatus_State } from '@/proto/dwango/nicolive/chat/data/atoms_pb'
import { NicoliveMessageSchema } from '@/proto/dwango/nicolive/chat/data/message_pb'
import { NicoliveStateSchema } from '@/proto/dwango/nicolive/chat/data/state_pb'
import {
  ChunkedMessage,
  ChunkedMessageSchema,
  PackedSegmentSchema,
} from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { toJson } from '@bufbuild/protobuf'
import { DurableObject } from 'cloudflare:workers'
import { LiveDO } from './live_do'

// 状態を持たずWorkerとして実装してもいいかも
export abstract class SegmentDO<Env = any> extends DurableObject<Env> {
  private readonly processed = {
    ids: new Set<string>(),
    uris: new Set<string>(),
  }

  abstract readonly liveService: DurableObjectNamespace<LiveDO>
  abstract readonly segmentService: DurableObjectNamespace<SegmentDO>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }

  /**
   * Segment: 最新のコメントを順次取得
   * Previous: Backward-Segment間のコメントを取得？
   * - ChunkedMessage形式
   * - ストリーム
   */
  async segment(uri: string) {
    if (this.processed.uris.has(uri)) return
    this.processed.uris.add(uri)

    console.log('[SegmentDO] attempt "segment"', uri)
    const stream = await fetchMessage(ChunkedMessageSchema, uri)
    for await (const message of stream) {
      console.log('[SegmentDO] attempt message on "segment"', message?.meta?.id)
      await this.#messageHandler(message)
    }
  }

  /**
   * Backward: 過去のすべてのコメントを取得
   * - PackedSegment形式
   * - 非ストリーム
   * - next.uriでさらに過去のデータを取得
   */
  async backward(liveId: string, uri: string) {
    if (this.processed.uris.has(uri)) return
    this.processed.uris.add(uri)

    console.log('[SegmentDO] attempt "backward"', uri)
    const { messages, next } = await fetchMessage(PackedSegmentSchema, uri)
    console.log('[SegmentDO] message count of "backward"', {
      count: messages.length,
    })
    await Promise.allSettled(messages.map((m) => this.#messageHandler(m)))

    if (next?.uri) {
      const stub = this.segmentService.getByName(liveId)
      await stub.backward(liveId, next.uri)
    }
  }

  /**
   * ChunkedMessageを処理する
   */
  async #messageHandler(...messages: ChunkedMessage[]) {
    await Promise.allSettled(
      messages.map(async ({ payload, meta }) => {
        // signalは用途がわからないしmessage idがないから無視
        if (payload.case === 'signal') return

        const messageId = meta?.id
        const liveId = meta?.origin?.origin.value?.liveId.toString()
        if (!messageId || !liveId) return

        // messageIdで重複排除
        if (this.processed.ids.has(messageId)) return
        this.processed.ids.add(messageId)

        const stub = this.liveService.getByName(`lv${liveId}`)

        switch (payload.case) {
          case 'message': {
            const data = toJson(NicoliveMessageSchema, payload.value)
            await stub.sendMessageBulk(JSON.stringify(data))
            break
          }

          case 'state': {
            const { programStatus } = payload.value
            if (programStatus?.state === ProgramStatus_State.Ended) {
              // this.ctx.abort()
            }

            const data = toJson(NicoliveStateSchema, payload.value)
            await stub.sendMessageBulk(JSON.stringify(data))
            break
          }
        }
      }),
    )
  }
}
