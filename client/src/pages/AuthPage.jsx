import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { clearError, login, register } from '../features/auth/authSlice'
import './auth.css'

const COPY = {
  login: {
    title: 'Welcome back',
    lede: 'Pick up where your circle left off.',
    cta: 'Log in',
    alt: ['New here?', 'Create an account', '/register'],
  },
  register: {
    title: 'Join Circl',
    lede: 'Follow people, share what you make, keep it personal.',
    cta: 'Create account',
    alt: ['Already have an account?', 'Log in', '/login'],
  },
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error" role="alert">{error}</span>}
    </label>
  )
}

export default function AuthPage({ mode }) {
  const dispatch = useDispatch()
  const location = useLocation()
  const { token, user, submitting, error, fields } = useSelector((s) => s.auth)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const copy = COPY[mode]
  const isRegister = mode === 'register'

  useEffect(() => { dispatch(clearError()) }, [mode, dispatch])

  if (token && user) return <Navigate to={location.state?.from || '/'} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    if (submitting) return
    dispatch(isRegister ? register(form) : login({ email: form.email, password: form.password }))
  }

  return (
    <div className="auth">
      <aside className="auth-aside" aria-hidden="true">
        <span className="auth-ring auth-ring-a" />
        <span className="auth-ring auth-ring-b" />
        <p className="auth-quote">Your people. Your posts. No noise.</p>
      </aside>
      <main className="auth-main">
        <Link to="/" className="wordmark" aria-label="Circl">
          <span className="wordmark-ring" aria-hidden="true" />
          <span>Circl</span>
        </Link>
        <h1 className="auth-title">{copy.title}</h1>
        <p className="auth-lede">{copy.lede}</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          {error && !Object.keys(fields).length && <p className="form-error" role="alert">{error}</p>}
          {isRegister && (
            <Field label="Username" error={fields.username}>
              <input value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={20} required />
            </Field>
          )}
          <Field label="Email" error={fields.email}>
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" required />
          </Field>
          <Field label="Password" error={fields.password}>
            <span className="pw">
              <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete={isRegister ? 'new-password' : 'current-password'} maxLength={72} required />
              <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeSlash size={22} /> : <Eye size={22} />}
              </button>
            </span>
          </Field>
          <button className="btn-primary" disabled={submitting}>{submitting ? 'One moment...' : copy.cta}</button>
        </form>

        <p className="auth-alt">{copy.alt[0]} <Link to={copy.alt[2]}>{copy.alt[1]}</Link></p>
      </main>
    </div>
  )
}
