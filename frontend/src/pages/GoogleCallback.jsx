import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function GoogleCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { handleGoogleToken } = useAuth()
    const [status, setStatus] = useState('Signing you in with Google...')

    useEffect(() => {
        const token = searchParams.get('token')
        const error = searchParams.get('error')

        if (error) {
            const messages = {
                google_denied: 'Google sign-in was cancelled.',
                google_token_failed: 'Google authentication failed. Please try again.',
                google_no_email: 'Could not retrieve your Google email.',
                google_db_error: 'Account setup failed. Please try again.',
            }
            setStatus(messages[error] || 'Google sign-in failed.')
            setTimeout(() => navigate('/login'), 2500)
            return
        }

        if (!token) {
            setStatus('No authentication token received.')
            setTimeout(() => navigate('/login'), 2000)
            return
        }

        handleGoogleToken(token)
            .then(() => {
                const redirect = sessionStorage.getItem('redirectAfterLogin')
                if (redirect) sessionStorage.removeItem('redirectAfterLogin')
                navigate(redirect || '/chat', { replace: true })
            })
            .catch(() => {
                setStatus('Failed to complete sign-in. Please try again.')
                setTimeout(() => navigate('/login'), 2000)
            })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{
            minHeight: '100vh',
            background: '#111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontFamily: 'sans-serif',
        }}>
            <div style={{ fontSize: '2rem' }}>🕯️</div>
            <p style={{ color: '#ccc', fontSize: '15px', margin: 0 }}>{status}</p>
            <div style={{
                width: '32px', height: '32px',
                border: '3px solid #16a34a',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
