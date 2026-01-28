import { sValidator } from '@hono/standard-validator'
import * as v from 'valibot'
import { factory } from './factory'

export const chatHandler = factory.createHandlers(
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
    using chats = await stub.getChats()
    return c.json(chats, 200)
  },
)
