import { factory } from './factory'
import { websocketHandler } from './websocket'

export const app = factory.createApp().get('/ws', ...websocketHandler)
