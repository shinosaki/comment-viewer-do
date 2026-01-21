import { fromBinary } from '@bufbuild/protobuf'
import { GenMessage } from '@bufbuild/protobuf/codegenv2'
import { sizeDelimitedDecodeStream } from '@bufbuild/protobuf/wire'
import {
  ChunkedEntry,
  ChunkedMessage,
  PackedSegment,
} from './proto/dwango/nicolive/chat/service/edge/payload_pb'

/**
 * URLからいずれかのスキーマのProtoBufメッセージを取得
 * - ChunkedEntry
 * - ChunkedMessage
 * - PackedSegment
 */

// MessageDO
export function fetchMessage(
  schema: GenMessage<ChunkedEntry>,
  uri: URL | string,
): Promise<AsyncIterableIterator<ChunkedEntry>>

// SegmentDO: Segment or Previous
export function fetchMessage(
  schema: GenMessage<ChunkedMessage>,
  uri: URL | string,
): Promise<AsyncIterableIterator<ChunkedMessage>>

// SegmentDO: Backward
export function fetchMessage(
  schema: GenMessage<PackedSegment>,
  uri: URL | string,
): Promise<PackedSegment>

export async function fetchMessage(
  schema: GenMessage<ChunkedEntry | ChunkedMessage | PackedSegment>,
  uri: URL | string,
): Promise<
  | AsyncIterableIterator<ChunkedEntry>
  | AsyncIterableIterator<ChunkedMessage>
  | PackedSegment
> {
  const res = await fetch(uri)
  switch (schema.typeName) {
    // MessageDO
    case 'dwango.nicolive.chat.service.edge.ChunkedEntry':
      return sizeDelimitedDecodeStream(
        schema as GenMessage<ChunkedEntry>,
        res.body!,
      )

    // SegmentDO: Segment or Previous
    case 'dwango.nicolive.chat.service.edge.ChunkedMessage':
      return sizeDelimitedDecodeStream(
        schema as GenMessage<ChunkedMessage>,
        res.body!,
      )

    // SegmentDO: Backward
    case 'dwango.nicolive.chat.service.edge.PackedSegment':
      return fromBinary(
        schema as GenMessage<PackedSegment>,
        new Uint8Array(await res.arrayBuffer()),
      )
  }
}
