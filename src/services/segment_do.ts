import { fetchStream, readMessage } from '@/ndgr'
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

export abstract class SegmentDO<Env = any> extends DurableObject<Env> {
  private readonly processedIds: Set<string> = new Set()

  abstract readonly liveService: DurableObjectNamespace<LiveDO>

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }

  async previous(uri: string) {
    console.log('[SegmentDO] attempt previous:', { uri: uri.toString() })
    const reader = await fetchStream(uri)
    for await (const { messages } of readMessage(PackedSegmentSchema, reader)) {
      // ChunkedMessage[]を処理
      // Array.lengthが多すぎるなら、in-memoryにキューしてAlarm APIで処理してもいいかも
      await Promise.allSettled(
        messages.map((m) => this.chunkedMessageHandler(m)),
      )
    }
  }

  async init(uri: string) {
    console.log('[SegmentDO] attempt handle:', { uri: uri.toString() })
    const reader = await fetchStream(uri)
    for await (const message of readMessage(ChunkedMessageSchema, reader)) {
      await this.chunkedMessageHandler(message)
    }
  }

  async chunkedMessageHandler({ payload, meta }: ChunkedMessage) {
    // metaは存在する前提
    if (!meta) return
    // liveIdは存在する前提
    const liveId = meta.origin?.origin.value?.liveId
    if (!liveId) return
    // タイムスタンプは存在する前提
    const timestamp = meta.at?.nanos
    if (!timestamp) return

    // メッセージの重複排除
    if (this.processedIds.has(meta.id)) return
    this.processedIds.add(meta.id)

    const stub = this.liveService.getByName(`lv${liveId}`)

    // 基本的にシリアライズしてLiveDOに送信する
    switch (payload.case) {
      // chat, gift など
      case 'message': {
        const data = toJson(NicoliveMessageSchema, payload.value)
        await stub.storeMessage(meta.id, JSON.stringify(data))
        return
      }

      // pool, stats など
      case 'state': {
        const data = toJson(NicoliveStateSchema, payload.value)
        await stub.storeMessage(meta.id, JSON.stringify(data))
        return
      }

      // FlushedというEnumなんだけどよくわからない
      // case 'signal': {
      // }
    }
  }
}
