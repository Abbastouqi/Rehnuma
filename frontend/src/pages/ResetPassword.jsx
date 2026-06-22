import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | success
  const [error, setError] = useState('')

  const token = params.get('token') || ''

  const handle = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(''); setStatus('loading')
    try {
      await resetPassword(token, form.password)
      setStatus('success')
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.')
      setStatus('idle')
    }
  }

  const card = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '48px 40px', maxWidth: '440px', width: '100%' }
  const inp = { width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '13px 16px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }
  const btn = { width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '32px' }}>🕯️</span>
          <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, fontFamily: 'serif', marginTop: '6px' }}>راہنما</div>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#14532d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✓</div>
            <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: '22px' }}>Password Reset!</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Your password has been updated successfully.</p>
            <button onClick={() => navigate('/login')} style={btn}>Sign in now →</button>
          </div>
        ) : (
          <>
            <h2 style={{ color: '#fff', margin: '0 0 8px', fontSize: '22px' }}>Set new password</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '28px' }}>Choose a strong password for your account.</p>
            {error && <div style={{ background: '#450a0a', color: '#fca5a5', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', marginBottom: '16px' }}>⚠ {error}</div>}
            <form onSubmit={handle}>
              <div style={{ position: 'relative' }}>
                <input style={inp} type={show ? 'text' : 'password'} placeholder="New password (min. 8 chars)"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required autoFocus/>
              </div>
              <input style={inp} type="password" placeholder="Confirm new password"
                value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required/>
              <button style={btn} type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Saving…' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
