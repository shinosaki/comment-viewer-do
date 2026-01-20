import { LiveDO, MessageDO, SegmentDO } from '@/services'
import { createFactory } from 'hono/factory'

type Env = {
  Bindings: Cloudflare.Env
  Variables: {
    dependencies: {
      liveService: DurableObjectNamespace<LiveDO>
      messageService: DurableObjectNamespace<MessageDO>
      segmentService: DurableObjectNamespace<SegmentDO>
    }
  }
}

export const factory = createFactory<Env>({
  initApp: (app) => {
    app.use((c, next) => {
      // dependency injection
      c.set('dependencies', {
        liveService: c.env.LIVE_SERVICE,
        messageService: c.env.MESSAGE_SERVICE,
        segmentService: c.env.SEGMENT_SERVICE,
      })
      return next()
    })
  },
})
