import { WebSocketRequest } from './websocket.types'

export const webSocketRequest = (ws: WebSocket, req: WebSocketRequest) => {
  ws.send(JSON.stringify(req))
}

export const startWatching = (ws: WebSocket) => {
  webSocketRequest(ws, {
    type: 'startWatching',
    data: {
      room: {
        protocol: 'webSocket',
        commentable: false,
      },
      reconnect: false,
    },
  })
}
