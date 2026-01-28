import { fetchMessage } from '@/ndgr'
import {
  ChunkedMessage,
  ChunkedMessageSchema,
  PackedSegmentSchema,
} from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { fromBinary, toBinary } from '@bufbuild/protobuf'
import { WorkerEntrypoint } from 'cloudflare:workers'

const messagesToBinaries = (arr: ChunkedMessage[]) =>
  arr.map((m) => toBinary(ChunkedMessageSchema, m))

export const messagesFromBinaries = (arr: Uint8Array<ArrayBufferLike>[]) =>
  arr.map((m) => fromBinary(ChunkedMessageSchema, m))

export abstract class SegmentWorker<Env = any> extends WorkerEntrypoint<Env> {
  /**
   * ChunkedMessage Handler
   * - segment
   * - previous
   */
  async chunked(uri: string): Promise<Uint8Array[]> {
    const stream = await fetchMessage(ChunkedMessageSchema, uri)
    const messages = await Array.fromAsync(stream)
    return messagesToBinaries(messages)
  }

  /**
   * PackedSegment Handler
   * - backward
   */
  async packed(
    uri: string,
  ): Promise<{ next?: string; messages: Uint8Array[] }> {
    const { next, messages } = await fetchMessage(PackedSegmentSchema, uri)
    return {
      next: next?.uri,
      messages: messagesToBinaries(messages),
    }
  }
}
