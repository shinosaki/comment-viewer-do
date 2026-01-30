import {
  ChangeEventHandler,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

export const App = () => {
  return (
    <div>
      <ChatApp />
    </div>
  )
}

const ChatApp = () => {
  const [channel, setChannel] = useState('')

  const handler: ChangeEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault()
    const { value } = e.currentTarget

    const match = value.match(/(lv\d+)/)
    if (match) {
      setChannel(match[1])
    } else {
      alert(`ライブID（例: lv123）を検出できません`)
    }
  }

  return (
    <Chat url="/ws">
      <input type="text" id="channel" onChange={handler} />
      <Channel channel={channel}>
        <MessageList />
      </Channel>
    </Chat>
  )
}

/**
 * Entity
 */
type ChatMessage = {
  content: string
  name: string
  vpos: number
  no: number
} & ({ hashedUserId: string } | { rawUserId: string })

type WebSocketResponse = { type: 'chat'; channel: string; data: ChatMessage[] }

/**
 * Chat
 * - websocket connection
 */
type Listener = (...messages: ChatMessage[]) => void

interface ChatContextProps {
  subscribe(channel: string, listener: Listener): void
  unsubscribe(channel: string, listener: Listener): void
}

const ChatContext = createContext<ChatContextProps | null>(null)

const useChat = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat() must be inside <Chat>')
  return ctx
}

type ChatProps = {
  url: string | URL
  children?: ReactNode
}

const Chat = ({ url, children }: ChatProps) => {
  const wsRef = useRef<WebSocket>(null)
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map())

  useEffect(() => {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const event: WebSocketResponse = JSON.parse(e.data)

      switch (event.type) {
        case 'chat': {
          const { channel, data } = event
          const listeners = listenersRef.current.get(channel)
          listeners?.forEach((l) => l(...data))
          break
        }

        default: {
          console.warn('unsupported event', event)
          break
        }
      }
    }

    return () => ws.close()
  }, [url])

  const subscribe = useCallback((channel: string, listener: Listener) => {
    const map = listenersRef.current
    const set = map.get(channel) ?? new Set()

    wsRef.current?.send(
      JSON.stringify({ type: 'subscribe', data: { channel } }),
    )

    set.add(listener)
    map.set(channel, set)
  }, [])

  const unsubscribe = useCallback((channel: string, listener: Listener) => {
    const map = listenersRef.current
    const set = map.get(channel)
    if (!set) return

    set.delete(listener)

    // listenerが0ならば
    if (set.size === 0) {
      wsRef.current?.send(
        JSON.stringify({ type: 'unsubscribe', data: { channel } }),
      )
      map.delete(channel)
    }
  }, [])

  return (
    <ChatContext.Provider value={{ subscribe, unsubscribe }}>
      {children}
    </ChatContext.Provider>
  )
}

/**
 * Channel
 */
interface ChannelContextProps {
  messages: ChatMessage[]
}

const ChannelContext = createContext<ChannelContextProps | null>(null)

const useChannel = () => {
  const ctx = useContext(ChannelContext)
  if (!ctx) throw new Error('useChannel must be inside <Channel>')
  return ctx
}

interface ChannelProps {
  channel: string
  children: ReactNode
}

const Channel = ({ channel, children }: ChannelProps) => {
  const { subscribe, unsubscribe } = useChat()
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const listener: Listener = (messages) => {
      setMessages((prev) => prev.concat(messages))
    }

    subscribe(channel, listener)
    return () => unsubscribe(channel, listener)
  }, [channel])

  return (
    <ChannelContext.Provider value={{ messages }}>
      {children}
    </ChannelContext.Provider>
  )
}

/**
 * MessageList
 */
const MessageList = () => {
  const { messages } = useChannel()
  return (
    <ul>
      {messages.map((m) => (
        <li key={m.no}>
          <span>{m.name}</span>
          <span>{m.content}</span>
        </li>
      ))}
    </ul>
  )
}
