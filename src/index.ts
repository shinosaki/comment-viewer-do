import { WorkerEntrypoint } from 'cloudflare:workers'
import { LiveDO } from './services/live_do'
import { MessageDO } from './services/message_do'
import { SegmentDO } from './services/segment_do'

export class LiveService extends LiveDO<Env> {
  messageService = this.env.MESSAGE_SERVICE
}

export class MessageService extends MessageDO<Env> {
  segmentService = this.env.SEGMENT_SERVICE
}

export class SegmentService extends SegmentDO<Env> {
  liveService = this.env.LIVE_SERVICE
}

export default class extends WorkerEntrypoint {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const pattern = [req.method, url.pathname].join(' ')
    switch (pattern) {
      case 'GET /ws': {
        const liveId = url.searchParams.get('id')
        if (!liveId) {
          return Response.json(
            { error: 'empty_params', keys: ['id'] },
            { status: 400 },
          )
        }

        const stub = this.env.LIVE_SERVICE.getByName(liveId)
        await stub.init(liveId)

        return stub.fetch(req)
      }

      default: {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
    }
  }
}
