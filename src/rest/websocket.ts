import { sValidator } from '@hono/standard-validator'
import * as v from 'valibot'
import { factory } from './factory'

export const websocketHandler = factory.createHandlers(
  sValidator(
    'query',
    v.object({
      liveId: v.pipe(v.string(), v.regex(/lv\d+/)),
    }),
  ),
  async (c) => {
    const { liveId } = c.req.valid('query')
    const { liveService } = c.get('dependencies')
    const stub = liveService.getByName(liveId)
    await stub.init(liveId)
    return stub.fetch(c.req.raw)
  },
)
