export type WebSocketRequest =
  | { type: 'pong' }
  | { type: 'keepSeat' }
  | { type: 'notifyNewVisit' }
  | {
      type: 'startWatching'
      data: {
        stream?: {
          quality: string
          protocol: string
          latency: string
          accessRightMethod: 'single_cookie'
          chasePlay: boolean
        }
        room: {
          protocol: 'webSocket'
          commentable: boolean
        }
        reconnect: boolean
      }
    }

export type WebSocketResponse =
  | { type: 'ping' }
  | {
      type: 'serverTime'
      data: {
        currentMs: string // 2026-01-01T01:01:01.024+09:00
      }
    }
  | {
      type: 'seat'
      data: { keepIntervalSec: number }
    }
  | {
      type: 'schedule'
      data: {
        begin: string // 2026-01-01T01:01:01+09:00
        end: string // 2026-01-01T01:01:01+09:00
      }
    }
  | {
      type: 'messageServer'
      data: {
        viewUri: string // url
        vposBaseTime: string // 2026-01-01T01:01:01+09:00
      }
    }
  | {
      type: 'akashicMessageServer'
      data: {
        viewUri: string // url
      }
    }
  | {
      type: 'statistics'
      data: {
        viewers: number
        comments: number
      }
    }
  | {
      type: 'disconnect'
      data: { reason: 'PING_TIMEOUT' }
    }
