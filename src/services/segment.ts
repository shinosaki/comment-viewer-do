import { fetchMessage } from '@/ndgr'
import {
  ChunkedMessage,
  ChunkedMessageSchema,
  PackedSegmentSchema,
} from '@/proto/dwango/nicolive/chat/service/edge/payload_pb'
import { fromBinary, toBinary } from '@bufbuild/protobuf'
import { getLogger } from '@logtape/logtape'
import { WorkerEntrypoint } from 'cloudflare:workers'

const logger = getLogger(['segment', 'worker'])

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
    const l = logger.with({ uri })
    l.debug('fetching chundked message')

    try {
      const stream = await fetchMessage(ChunkedMessageSchema, uri)
      l.debug('chunked message stream fetched')

      const messages = await Array.fromAsync(stream)
      l.info('chunked messages processed', { count: messages.length })

      return messagesToBinaries(messages)
    } catch (error) {
      l.error('chunked message error', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * PackedSegment Handler
   * - backward
   */
  async packed(
    uri: string,
  ): Promise<{ next?: string; messages: Uint8Array[] }> {
    const l = logger.with({ uri })
    l.debug('fetching packed segment')

    try {
      const { next, messages } = await fetchMessage(PackedSegmentSchema, uri)
      l.info('packed segment fetched', {
        next: next?.uri,
        count: messages.length,
      })

      return {
        next: next?.uri,
        messages: messagesToBinaries(messages),
      }
    } catch (error) {
      l.error('packed segment error', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
