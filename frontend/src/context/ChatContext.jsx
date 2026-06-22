import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import api from '../services/api'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [activeDoc, setActiveDoc] = useState(null)   // { id, filename, size }
  const abortRef = useRef(null)

  const loadChats = useCallback(async (archived = false) => {
    const { data } = await api.get('/chats', { params: { archived } })
    setChats(data)
  }, [])

  const selectChat = useCallback(async (chatId) => {
    const { data } = await api.get(`/chats/${chatId}`)
    setActiveChat(data)
    setMessages(data.messages)
    setActiveDoc(null)
  }, [])

  const newChat = useCallback(async () => {
    setActiveChat(null)
    setMessages([])
    setActiveDoc(null)
  }, [])

  const deleteChat = useCallback(async (chatId) => {
    await api.delete(`/chats/${chatId}`)
    setChats((prev) => prev.filter((c) => c.id !== chatId))
    if (activeChat?.id === chatId) {
      setActiveChat(null)
      setMessages([])
      setActiveDoc(null)
    }
  }, [activeChat])

  const renameChat = useCallback(async (chatId, title) => {
    const { data } = await api.patch(`/chats/${chatId}`, { title })
    setChats((prev) => prev.map((c) => (c.id === chatId ? data : c)))
    if (activeChat?.id === chatId) setActiveChat(data)
  }, [activeChat])

  const updateChat = useCallback(async (chatId, patch) => {
    const { data } = await api.patch(`/chats/${chatId}`, patch)
    setChats((prev) => prev.map((c) => (c.id === chatId ? data : c)))
    if (activeChat?.id === chatId) setActiveChat(data)
    return data
  }, [activeChat])

  const exportChat = useCallback(async (chatId, title) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/chats/${chatId}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'chat'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const uploadDocument = useCallback(async (file) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setActiveDoc(data)
    return data
  }, [])

  const clearDocument = useCallback(() => setActiveDoc(null), [])

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const sendMessage = useCallback(async (content, botId = null, webSearch = false) => {
    let currentChat = activeChat
    let isNewChat = false
    if (!currentChat) {
      const { data } = await api.post('/chats', { title: 'New Chat', bot_id: botId })
      setChats((prev) => [data, ...prev])
      setActiveChat(data)
      setMessages([])
      currentChat = data
      isNewChat = true
    }

    const docSnapshot = activeDoc ? { ...activeDoc } : null

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content,
      document: docSnapshot,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    const assistantMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      document: docSnapshot,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, assistantMsg])
    setStreaming(true)

    // Clear document after attaching to this message
    if (docSnapshot) setActiveDoc(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chats/${currentChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, document_id: docSnapshot?.id ?? null, web_search: webSearch }),
        signal: controller.signal,
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          // Tokens are JSON-encoded on the backend so embedded newlines survive SSE
          let chunk
          try { chunk = JSON.parse(raw) } catch { chunk = raw }
          setMessages((prev) => {
            const updated = [...prev]
            const last = { ...updated[updated.length - 1] }
            last.content += chunk
            updated[updated.length - 1] = last
            return updated
          })
        }
      }

      loadChats()
      // Sync real DB IDs so future edits can find the correct message
      try {
        const { data: synced } = await api.get(`/chats/${currentChat.id}`)
        setMessages(synced.messages)
      } catch {}
    } catch (err) {
      if (err.name !== 'AbortError') throw err
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
    return isNewChat ? currentChat : null
  }, [activeChat, activeDoc, loadChats])

  // Edit an existing user message by its array index.
  // We use the index (not the frontend ID) because messages created in the same
  // session have temporary IDs that don't exist in the database yet.
  const editMessage = useCallback(async (msgIndex, newContent) => {
    if (!activeChat) return

    // Load fresh messages to get real DB IDs
    const { data: freshChat } = await api.get(`/chats/${activeChat.id}`)
    const freshMessages = freshChat.messages

    const realMsg = freshMessages[msgIndex]
    if (!realMsg) return

    // Truncate DB from this message onwards (inclusive)
    await api.delete(`/chats/${activeChat.id}/messages/from/${realMsg.id}`)

    // Set local state to everything before the edited message
    setMessages(freshMessages.slice(0, msgIndex))

    // Optimistically append the edited user message + blank assistant placeholder
    const userMsg = { id: Date.now(), role: 'user', content: newContent, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    const assistantMsg = { id: Date.now() + 1, role: 'assistant', content: '', created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, assistantMsg])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chats/${activeChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newContent }),
        signal: controller.signal,
      })
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          let chunk
          try { chunk = JSON.parse(raw) } catch { chunk = raw }
          setMessages((prev) => {
            const updated = [...prev]
            const last = { ...updated[updated.length - 1] }
            last.content += chunk
            updated[updated.length - 1] = last
            return updated
          })
        }
      }
      loadChats()
      // Sync real IDs after edit response is saved
      try {
        const { data: synced } = await api.get(`/chats/${activeChat.id}`)
        setMessages(synced.messages)
      } catch {}
    } catch (err) {
      if (err.name !== 'AbortError') throw err
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
  }, [activeChat, loadChats])

  return (
    <ChatContext.Provider value={{
      chats, activeChat, messages, streaming,
      activeDoc, uploadDocument, clearDocument,
      loadChats, selectChat, newChat, deleteChat, renameChat, updateChat, exportChat, sendMessage, stopGeneration, editMessage,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
