import { EmbeddedData } from './nico.types'

/**
 * Regex Patterns
 */
const liveIdPattern = /lv\d+/
const embeddedDataPattern =
  /id="embedded-data" data-props="(\{.*?\})"><\/script>/

/**
 * Clients
 */
type RequestHandler = (req: Request) => Promise<Response>

const decodeHtmlEntities = (v: string) =>
  v
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')

export const fetchEmbeddedData = async (
  liveId: string,
  handler: RequestHandler = fetch,
): Promise<EmbeddedData> => {
  if (!liveIdPattern.test(liveId)) {
    throw new Error('invalid live id')
  }
  const url = `https://live.nicovideo.jp/watch/${liveId}`
  const req = new Request(url)

  const res = await handler(req)
  const text = await res.text()

  const match = text.match(embeddedDataPattern)
  if (!match) {
    throw new Error('not match embedded-data pattern')
  }

  const raw = match[1]
  const json = JSON.parse(decodeHtmlEntities(raw))

  return json
}
