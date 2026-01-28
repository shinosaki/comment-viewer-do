import { configure, getConsoleSink } from '@logtape/logtape'
import { app } from './rest'
import { LiveDO, MessageDO, SegmentWorker } from './services'

await configure({
  sinks: {
    console: getConsoleSink({
      formatter: (r) => JSON.stringify(r),
    }),
  },
  loggers: [{ category: [], lowestLevel: 'info', sinks: ['console'] }],
})

export class LiveService extends LiveDO<Env> {
  messageService = this.env.MESSAGE_SERVICE
}

export class MessageService extends MessageDO<Env> {
  segmentService = this.env.SEGMENT_SERVICE
  liveService = this.env.LIVE_SERVICE
}

// export class SegmentService extends SegmentDO<Env> {
//   liveService = this.env.LIVE_SERVICE
//   segmentService = this.env.SEGMENT_SERVICE
// }
export class SegmentService extends SegmentWorker {}

export default app
