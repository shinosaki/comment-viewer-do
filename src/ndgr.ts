import { Message } from '@bufbuild/protobuf'
import { GenMessage } from '@bufbuild/protobuf/codegenv2'
import { sizeDelimitedDecodeStream } from '@bufbuild/protobuf/wire'

// readable stream to generator
async function* toIter(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

export const fetchStream = async (uri: URL | string) => {
  const res = await fetch(uri)
  if (!res.body) {
    throw new Error('response body is null')
  }
  return res.body
}

export const readMessage = <T extends Message, M extends GenMessage<T>>(
  m: M,
  s: ReadableStream,
) => {
  const iter = toIter(s)
  const stream = sizeDelimitedDecodeStream(m, iter)
  return stream
}
