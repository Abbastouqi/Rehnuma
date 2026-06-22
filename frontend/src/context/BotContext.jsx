import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const BotContext = createContext(null)

export function BotProvider({ children }) {
  const [bots, setBots] = useState([])
  const [activeBot, setActiveBot] = useState(null)

  const loadBots = useCallback(async () => {
    const { data } = await api.get('/bots')
    setBots(data)
    return data
  }, [])

  const getBot = useCallback(async (id) => {
    const { data } = await api.get(`/bots/${id}`)
    return data
  }, [])

  const createBot = useCallback(async (payload) => {
    const { data } = await api.post('/bots', payload)
    setBots(prev => [data, ...prev])
    return data
  }, [])

  const updateBot = useCallback(async (id, payload) => {
    const { data } = await api.put(`/bots/${id}`, payload)
    setBots(prev => prev.map(b => b.id === id ? data : b))
    return data
  }, [])

  const deleteBot = useCallback(async (id) => {
    await api.delete(`/bots/${id}`)
    setBots(prev => prev.filter(b => b.id !== id))
    if (activeBot?.id === id) setActiveBot(null)
  }, [activeBot])

  const selectBot = useCallback((bot) => setActiveBot(bot), [])
  const clearBot = useCallback(() => setActiveBot(null), [])

  return (
    <BotContext.Provider value={{
      bots, activeBot,
      loadBots, getBot, createBot, updateBot, deleteBot,
      selectBot, clearBot,
    }}>
      {children}
    </BotContext.Provider>
  )
}

export const useBot = () => useContext(BotContext)
