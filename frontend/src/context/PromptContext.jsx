import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../services/api'

const PromptContext = createContext(null)

export function PromptProvider({ children }) {
  const [prompts, setPrompts] = useState([])

  const loadPrompts = useCallback(async () => {
    const { data } = await api.get('/prompts')
    setPrompts(data)
  }, [])

  useEffect(() => { loadPrompts() }, [loadPrompts])

  const createPrompt = useCallback(async (payload) => {
    const { data } = await api.post('/prompts', payload)
    setPrompts(prev => [...prev, data])
    return data
  }, [])

  const updatePrompt = useCallback(async (id, payload) => {
    const { data } = await api.put(`/prompts/${id}`, payload)
    setPrompts(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [])

  const deletePrompt = useCallback(async (id) => {
    await api.delete(`/prompts/${id}`)
    setPrompts(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <PromptContext.Provider value={{ prompts, loadPrompts, createPrompt, updatePrompt, deletePrompt }}>
      {children}
    </PromptContext.Provider>
  )
}

export const usePrompts = () => useContext(PromptContext)
