import { LiveDO } from '@/services'
import { createFactory } from 'hono/factory'

type Env = {
  Bindings: Cloudflare.Env
  Variables: {
    dependencies: {
      liveService: DurableObjectNamespace<LiveDO>
    }
  }
}

export const factory = createFactory<Env>({
  initApp: (app) => {
    app.use((c, next) => {
      // dependency injection
      c.set('dependencies', {
        liveService: c.env.LIVE_SERVICE,
      })
      return next()
    })
  },
})
