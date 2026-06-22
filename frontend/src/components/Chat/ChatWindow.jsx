import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useBot } from '../../context/BotContext'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

const DEFAULT_SUGGESTIONS = [
  { icon: '💡', text: 'Explain quantum computing in simple terms' },
  { icon: '🐍', text: 'Write a Python function to reverse a string' },
  { icon: '🌐', text: 'What are REST API best practices?' },
  { icon: '🤖', text: 'Summarize the key ideas of machine learning' },
]

export default function ChatWindow() {
  const { messages, streaming, sendMessage, newChat, selectChat, activeChat } = useChat()
  const { activeBot, clearBot } = useBot()
  const { chatId } = useParams()
  const navigate = useNavigate()
  const bottomRef = useRef(null)
  const [loadingChat, setLoadingChat] = useState(() => !!chatId)

  // Load chat from URL param on mount and when URL changes
  useEffect(() => {
    if (chatId) {
      const id = parseInt(chatId, 10)
      if (!activeChat || activeChat.id !== id) {
        setLoadingChat(true)
        selectChat(id)
          .catch(() => navigate('/chat', { replace: true }))
          .finally(() => setLoadingChat(false))
      }
    }
  }, [chatId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isEmpty = messages.length === 0

  // Auto-send any prompt typed on the landing page before login
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingPrompt')
    if (pending && isEmpty && !streaming) {
      sessionStorage.removeItem('pendingPrompt')
      handleSend(pending)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const starters = activeBot?.starters?.filter(Boolean).length > 0
    ? activeBot.starters.filter(Boolean).map(text => ({ icon: activeBot.icon, text }))
    : DEFAULT_SUGGESTIONS

  const handleSend = async (text, webSearch = false) => {
    const newChat = await sendMessage(text, activeBot?.id ?? null, webSearch)
    if (newChat?.id) navigate(`/chat/${newChat.id}`, { replace: true })
  }

  const handleNewChat = () => {
    clearBot()
    newChat()
    navigate('/chat', { replace: true })
  }

  return (
    <div className="flex flex-col h-full bg-[#131420] flex-1">

      {/* Top bar — visible when conversation is active */}
      {!isEmpty && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          {activeBot ? (
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeBot.icon}</span>
              <span className="text-white text-sm font-medium">{activeBot.name}</span>
              <span className="text-gray-600 text-xs">·</span>
              <button onClick={clearBot} className="text-gray-500 hover:text-gray-300 text-xs transition">
                Switch to default
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium" style={{ fontFamily: 'serif' }}>راہنما</span>
            </div>
          )}
          <button
            onClick={handleNewChat}
            disabled={streaming}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-40 transition px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14"/>
            </svg>
            New chat
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {loadingChat ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin"/>
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center px-4 pb-10">
            {activeBot ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#2f2f2f] border border-white/10 flex items-center justify-center text-4xl mb-4 shadow-lg">
                  {activeBot.icon}
                </div>
                <h2 className="text-white text-xl font-semibold mb-1">{activeBot.name}</h2>
                <p className="text-gray-500 text-sm mb-1 max-w-sm text-center">{activeBot.description}</p>
                <p className="text-gray-600 text-xs mb-8">Powered by Rahnuma · Riphah International</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-black rounded-2xl border border-green-800/50 flex items-center justify-center text-2xl mb-4 shadow-lg">
                  🕯️
                </div>
                <h2 className="text-white text-2xl font-semibold mb-1" style={{ fontFamily: 'serif' }}>
                  راہنما
                </h2>
                <p className="text-gray-500 text-sm mb-8">Riphah International University · AI Assistant</p>
              </>
            )}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
              {starters.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSend(s.text)}
                  className="text-left bg-[#1c1e30] hover:bg-[#252840] border border-white/8 hover:border-green-500/25 rounded-xl px-4 py-3 transition"
                >
                  <span className="block text-base mb-1">{s.icon}</span>
                  <span className="text-gray-300 text-sm leading-snug">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 pb-4">
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} msgIndex={idx} botName={activeBot?.name ?? null} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <MessageInput onSend={handleSend} />
    </div>
  )
}
