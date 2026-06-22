import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); setMessage('No verification token found.'); return }
    verifyEmail(token)
      .then(data => { setStatus('success'); setMessage(data.message) })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.detail || 'Verification failed. The link may have expired.')
      })
  }, []) // eslint-disable-line

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '36px' }}>🕯️</span>
          <div style={{ color: '#fff', fontSize: '20px', fontWeight: 700, fontFamily: 'serif', marginTop: '6px' }}>راہنما</div>
          <div style={{ color: '#555', fontSize: '12px' }}>Riphah International University</div>
        </div>

        {status === 'loading' && (
          <>
            <div style={{ width: '36px', height: '36px', border: '3px solid #333', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }}/>
            <p style={{ color: '#888' }}>Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: '64px', height: '64px', background: '#14532d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✓</div>
            <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: '22px' }}>Email Verified!</h2>
            <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>{message}</p>
            <button onClick={() => navigate('/login')}
              style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
              Sign in now →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: '64px', height: '64px', background: '#450a0a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✕</div>
            <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: '22px' }}>Verification Failed</h2>
            <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>{message}</p>
            <button onClick={() => navigate('/login')}
              style={{ background: '#2a2a2a', color: '#ccc', border: '1px solid #3a3a3a', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', cursor: 'pointer', width: '100%' }}>
              Back to login
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
