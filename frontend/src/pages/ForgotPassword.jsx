import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | sent
  const [error, setError] = useState('')
  const { forgotPassword } = useAuth()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    setError(''); setStatus('loading')
    try {
      await forgotPassword(email)
      setStatus('sent')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
      setStatus('idle')
    }
  }

  const card = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '48px 40px', maxWidth: '440px', width: '100%' }
  const inp = { width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '13px 16px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const btn = { width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '16px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '32px' }}>🕯️</span>
          <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, fontFamily: 'serif', marginTop: '6px' }}>راہنما</div>
        </div>

        {status === 'sent' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✉️</div>
            <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: '20px' }}>Check your inbox</h2>
            <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              If an account with <strong style={{ color: '#ccc' }}>{email}</strong> exists, a password reset link has been sent.
            </p>
            <button onClick={() => navigate('/login')} style={{ ...btn, background: '#2a2a2a', border: '1px solid #3a3a3a', color: '#ccc', marginTop: 0 }}>
              Back to login
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ color: '#fff', margin: '0 0 8px', fontSize: '22px' }}>Reset password</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>Enter your email and we'll send you a reset link.</p>
            {error && <div style={{ background: '#450a0a', color: '#fca5a5', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>}
            <form onSubmit={handle}>
              <input style={inp} type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus/>
              <button style={btn} type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px', color: '#666', fontSize: '13px' }}>
              Remember your password?{' '}
              <span onClick={() => navigate('/login')} style={{ color: '#16a34a', cursor: 'pointer' }}>Sign in</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
