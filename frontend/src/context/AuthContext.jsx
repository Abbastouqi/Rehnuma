import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')) }
        catch { return null }
    })

    const login = useCallback(async (username, password) => {
        const { data } = await api.post('/auth/login', { username, password })
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
    }, [])

    const register = useCallback(async (username, email, password) => {
        const { data } = await api.post('/auth/register', { username, email, password })
        return data // { message, email }
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }, [])

    const forgotPassword = useCallback(async (email) => {
        const { data } = await api.post('/auth/forgot-password', { email })
        return data
    }, [])

    const resetPassword = useCallback(async (token, newPassword) => {
        const { data } = await api.post('/auth/reset-password', { token, new_password: newPassword })
        return data
    }, [])

    const verifyEmail = useCallback(async (token) => {
        const { data } = await api.get(`/auth/verify/${token}`)
        return data
    }, [])

    const resendVerification = useCallback(async (email) => {
        const { data } = await api.post('/auth/resend-verification', { email })
        return data
    }, [])

    // Google OAuth — opens Google login popup/redirect
    const loginWithGoogle = useCallback(async () => {
        const { data } = await api.get('/auth/google')
        window.location.href = data.url
    }, [])

    // Called by GoogleCallback page after redirect with ?token=
    const handleGoogleToken = useCallback(async (token) => {
        localStorage.setItem('token', token)
        const { data } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        })
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
    }, [])

    return (
        <AuthContext.Provider value={{ user, login, register, logout, forgotPassword, resetPassword, verifyEmail, resendVerification, loginWithGoogle, handleGoogleToken }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
