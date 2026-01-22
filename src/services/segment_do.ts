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
      const liveId = message.meta?.origin?.origin.value?.liveId.toString()
      if (!liveId) continue

      const stub = this.liveService.getByName(`lv${liveId}`)
      await Promise.allSettled(
        Object.entries(await this.#messageHandler(message)).map(
          ([schema, data]) => stub.sendMessageBulk(schema, ...data),
        ),
      )
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

    const stub = this.liveService.getByName(liveId)
    await Promise.allSettled(
      Object.entries(await this.#messageHandler(...messages)).map(
        ([schema, data]) => stub.sendMessageBulk(schema, ...data),
      ),
    )

    if (next?.uri) {
      const stub = this.segmentService.getByName(liveId)
      await stub.backward(liveId, next.uri)
    }
  }

  /**
   * ChunkedMessageを処理する
   */
  async #messageHandler(...messages: ChunkedMessage[]) {
    const promises = messages.map(async ({ payload, meta }) => {
      const id = meta?.id ?? 'undefined'

      if (this.processed.ids.has(id)) return
      this.processed.ids.add(id)

      switch (payload.case) {
        case 'message': {
          const data = toJson(NicoliveMessageSchema, payload.value)
          return { type: payload.case, data }
        }

        case 'state': {
          const state =
            payload.value.programStatus?.state ?? ProgramStatus_State.Unknown
          if (state === ProgramStatus_State.Ended) return

          const data = toJson(NicoliveStateSchema, payload.value)
          return { type: payload.case, data }
        }

        default:
          return
      }
    })

    const results = (await Promise.all(promises)).filter((v) => v !== undefined)
    const groups = Object.groupBy(results, (r) => r.type)
    return {
      message:
        groups.message?.map((v) => v.data).filter((v) => v !== undefined) ?? [],
      state:
        groups.state?.map((v) => v.data).filter((v) => v !== undefined) ?? [],
    }
  }
}
