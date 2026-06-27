import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import './auth.css'

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
    )
}

export default function AuthPage() {
    const { login, register, resendVerification, loginWithGoogle } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const [mode, setMode] = useState(null)
    const [loginForm, setLoginForm] = useState({ username: '', password: '' })
    const [showPw, setShowPw] = useState(false)
    const [loginError, setLoginError] = useState('')
    const [loginLoading, setLoginLoading] = useState(false)
    const [unverifiedEmail, setUnverifiedEmail] = useState('')
    const [resendMsg, setResendMsg] = useState('')

    const [regForm, setRegForm] = useState({ username: '', email: '', password: '', confirm: '' })
    const [showRegPw, setShowRegPw] = useState(false)
    const [regError, setRegError] = useState('')
    const [regLoading, setRegLoading] = useState(false)
    const [regSuccess, setRegSuccess] = useState(null) // { email } after successful register

    const pendingPrompt = sessionStorage.getItem('pendingPrompt')

    useEffect(() => {
        const initial = location.pathname === '/register' ? 'sign-up' : 'sign-in'
        const t = setTimeout(() => setMode(initial), 200)
        return () => clearTimeout(t)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    const toggle = () => {
        const next = mode === 'sign-in' ? 'sign-up' : 'sign-in'
        setMode(next)
        setLoginError(''); setRegError(''); setRegSuccess(null); setUnverifiedEmail(''); setResendMsg('')
        navigate(next === 'sign-in' ? '/login' : '/register', { replace: true })
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoginError(''); setUnverifiedEmail(''); setResendMsg('')
        setLoginLoading(true)
        try {
            await login(loginForm.username, loginForm.password)
            const redirect = sessionStorage.getItem('redirectAfterLogin')
            if (redirect) sessionStorage.removeItem('redirectAfterLogin')
            setTimeout(() => navigate(redirect || '/chat'), 400)
        } catch (err) {
            if (!err.response) {
                setLoginError('Cannot reach the server. Make sure the backend is running.')
            } else if (err.response?.data?.detail === 'EMAIL_NOT_VERIFIED') {
                setUnverifiedEmail(loginForm.username)
                setLoginError('Your email is not verified. Please check your inbox.')
            } else {
                const detail = err.response?.data?.detail
                setLoginError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Login failed')
            }
        } finally {
            setLoginLoading(false)
        }
    }

    const handleResend = async () => {
        try {
            // Resend by email — we only have username, so ask for email
            setResendMsg('Please use your email address to resend the verification email.')
            setUnverifiedEmail('')
        } catch (err) {
            setResendMsg('Failed to resend. Please try again.')
        }
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        if (regForm.password !== regForm.confirm) { setRegError('Passwords do not match'); return }
        if (regForm.password.length < 8) { setRegError('Password must be at least 8 characters'); return }
        setRegError(''); setRegLoading(true)
        try {
            await register(regForm.username, regForm.email, regForm.password)
            setRegSuccess({ email: regForm.email })
        } catch (err) {
            if (!err.response) {
                setRegError('Cannot reach the server.')
            } else {
                const detail = err.response?.data?.detail
                setRegError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Registration failed')
            }
        } finally {
            setRegLoading(false)
        }
    }

    const containerClass = ['auth-wrap', mode].filter(Boolean).join(' ')

    return (
        <div className={containerClass}>
            <div className="auth-deco auth-deco-a" aria-hidden="true"/>
            <div className="auth-deco auth-deco-b" aria-hidden="true"/>
            <div className="auth-watermark">
                <span className="auth-watermark-text">راہنما</span>
                <span className="auth-watermark-sub">Riphah International University</span>
            </div>

            <div className="row">
                {/* SIGN UP */}
                <div className="col align-items-center flex-col sign-up">
                    <div className="form-wrapper align-items-center">
                        <div className="form sign-up">
                            {regSuccess ? (
                                /* ── Verification sent state ── */
                                <div className="auth-verify-sent">
                                    <div className="verify-icon">✉️</div>
                                    <h3>Check your email</h3>
                                    <p>We sent a verification link to</p>
                                    <strong>{regSuccess.email}</strong>
                                    <p className="verify-note">Click the link in the email to activate your account. Check spam if you don't see it.</p>
                                    <button className="btn-submit" onClick={toggle}>Back to Sign in</button>
                                </div>
                            ) : (
                                <>
                                    <button type="button" className="btn-google" onClick={loginWithGoogle}>
                                        <GoogleIcon />
                                        Continue with Google
                                    </button>
                                    <div className="auth-divider"><span>or</span></div>
                                    {regError && <div className="auth-error">⚠ {regError}</div>}
                                    <form onSubmit={handleRegister}>
                                        <div className="input-field-wrap">
                                            <label className="input-label">Username</label>
                                            <div className="input-group">
                                                <i className="bx bxs-user"></i>
                                                <input type="text" placeholder="Username" value={regForm.username}
                                                    onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                                                    required autoComplete="username"/>
                                            </div>
                                        </div>
                                        <div className="input-field-wrap">
                                            <label className="input-label">Email</label>
                                            <div className="input-group">
                                                <i className="bx bx-mail-send"></i>
                                                <input type="email" placeholder="Email address" value={regForm.email}
                                                    onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                                    required autoComplete="email"/>
                                            </div>
                                        </div>
                                        <div className="input-field-wrap">
                                            <label className="input-label">Password</label>
                                            <div className="input-group">
                                                <i className="bx bxs-lock-alt"></i>
                                                <input type={showRegPw ? 'text' : 'password'} placeholder="Password"
                                                    value={regForm.password}
                                                    onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                                    required autoComplete="new-password"/>
                                                <button type="button" className="pw-toggle" onClick={() => setShowRegPw(v => !v)} title={showRegPw ? 'Hide password' : 'Show password'}>
                                                    {showRegPw ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="input-field-wrap">
                                            <label className="input-label">Confirm Password</label>
                                            <div className="input-group">
                                                <i className="bx bxs-lock-alt"></i>
                                                <input type="password" placeholder="Confirm password" value={regForm.confirm}
                                                    onChange={e => setRegForm({ ...regForm, confirm: e.target.value })}
                                                    required autoComplete="new-password"/>
                                            </div>
                                        </div>
                                        <button type="submit" className="btn-submit" disabled={regLoading}>
                                            {regLoading ? 'Creating account…' : 'Create Account'}
                                        </button>
                                    </form>
                                    <p><span>Already have an account? </span><b className="pointer" onClick={toggle}>Sign in here</b></p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* SIGN IN */}
                <div className="col align-items-center flex-col sign-in">
                    <div className="form-wrapper align-items-center">
                        <div className="form sign-in">
                            {pendingPrompt && (
                                <div className="auth-pending">
                                    💬 You'll send: "<em>{pendingPrompt.length > 55 ? pendingPrompt.slice(0, 55) + '…' : pendingPrompt}</em>"
                                </div>
                            )}
                            <button type="button" className="btn-google" onClick={loginWithGoogle}>
                                <GoogleIcon />
                                Continue with Google
                            </button>
                            <div className="auth-divider"><span>or</span></div>
                            {loginError && (
                                <div className="auth-error">
                                    ⚠ {loginError}
                                    {unverifiedEmail && (
                                        <button className="resend-btn" onClick={handleResend}>Resend verification email</button>
                                    )}
                                </div>
                            )}
                            {resendMsg && <div className="auth-info">{resendMsg}</div>}
                            <form onSubmit={handleLogin}>
                                <div className="input-field-wrap">
                                    <label className="input-label">Username</label>
                                    <div className="input-group">
                                        <i className="bx bxs-user"></i>
                                        <input type="text" placeholder="Username" value={loginForm.username}
                                            onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                                            required autoFocus autoComplete="username"/>
                                    </div>
                                </div>
                                <div className="input-field-wrap">
                                    <label className="input-label">Password</label>
                                    <div className="input-group">
                                        <i className="bx bxs-lock-alt"></i>
                                        <input type={showPw ? 'text' : 'password'} placeholder="Password"
                                            value={loginForm.password}
                                            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                            required autoComplete="current-password"/>
                                        <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} title={showPw ? 'Hide password' : 'Show password'}>
                                            {showPw ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="btn-submit"
                                    disabled={loginLoading || !loginForm.username || !loginForm.password}>
                                    {loginLoading ? 'Signing in…' : 'Sign in'}
                                </button>
                            </form>
                            <p>
                                <b className="pointer" onClick={() => navigate('/forgot-password')}>Forgot password?</b>
                            </p>
                            <p><span>Don't have an account? </span><b className="pointer" onClick={toggle}>Sign up here</b></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row content-row">
                <div className="col align-items-center flex-col">
                    <div className="text sign-in"><h2>Welcome</h2><p>Riphah International University</p></div>
                    <div className="img sign-in">
                        <div className="brand-visual">
                            <img src="/riphah_logo.png" alt="Riphah" className="brand-logo" />
                            <span className="brand-name">راہنما</span>
                            <span className="brand-sub">AI Assistant</span>
                        </div>
                    </div>
                </div>
                <div className="col align-items-center flex-col">
                    <div className="img sign-up">
                        <div className="brand-visual">
                            <img src="/riphah_logo.png" alt="Riphah" className="brand-logo" />
                            <span className="brand-name">راہنما</span>
                            <span className="brand-sub">AI Assistant</span>
                        </div>
                    </div>
                    <div className="text sign-up"><h2>Join with us</h2><p>Riphah International University</p></div>
                </div>
            </div>
        </div>
    )
}
