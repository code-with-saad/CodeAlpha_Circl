import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { getTheme, setTheme } from '../lib/theme'
import { toast } from '../lib/feedback'
import { logout, tokenRefreshed } from '../features/auth/authSlice'
import './notifications.css'
import './auth.css'

const THEMES = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]

export default function SettingsPage() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const [theme, setThemeState] = useState(getTheme)

  function pickTheme(t) {
    setTheme(t)
    setThemeState(t)
  }

  return (
    <>
      <h1 className="page-title">Settings</h1>

      <section className="set-section" aria-labelledby="set-look">
        <h2 id="set-look">Appearance</h2>
        <div className="seg" role="radiogroup" aria-label="Theme">
          {THEMES.map(([key, label]) => (
            <button key={key} role="radio" aria-checked={theme === key} onClick={() => pickTheme(key)}>{label}</button>
          ))}
        </div>
      </section>

      <section className="set-section" aria-labelledby="set-account">
        <h2 id="set-account">Account</h2>
        <p>Signed in as <strong>@{user.username}</strong> ({user.email})</p>
        <div className="set-row">
          <Link to="/edit-profile" className="btn-outline">Edit profile</Link>
          {user.role === 'admin' && <Link to="/admin" className="btn-outline">Admin panel</Link>}
        </div>
      </section>

      <PasswordForm onChanged={(token) => dispatch(tokenRefreshed(token))} />

      <section className="set-section" aria-labelledby="set-session">
        <h2 id="set-session">Session</h2>
        <button className="btn-outline" onClick={() => dispatch(logout())}>Log out</button>
      </section>

      {user.role !== 'admin' && <DeleteAccount onDeleted={() => dispatch(logout())} />}
    </>
  )
}

function PasswordForm({ onChanged }) {
  const username = useSelector((st) => st.auth.user.username)
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [fields, setFields] = useState({})
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setFields({})
    if (form.next !== form.confirm) return setFields({ confirm: 'Passwords do not match' })
    setBusy(true)
    try {
      const { data } = await api.patch('/users/me/password', { current: form.current, next: form.next })
      onChanged(data.token)
      setForm({ current: '', next: '', confirm: '' })
      toast.success('Password updated. Other devices were signed out.')
    } catch (err) {
      const f = fieldErrors(err)
      setFields(f)
      // Field problems are shown next to the field; anything else is a toast.
      if (!Object.keys(f).length) toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="set-section" aria-labelledby="set-pw">
      <h2 id="set-pw">Change password</h2>
      <form className="set-form" onSubmit={submit} noValidate>
        {/* Lets password managers file the new password under the right account */}
        <input className="sr-only" type="text" name="username" autoComplete="username" value={username} readOnly tabIndex={-1} aria-hidden="true" />
        <label className="field"><span className="field-label">Current password</span>
          <input type="password" autoComplete="current-password" value={form.current} onChange={set('current')} required />
          {fields.current && <span className="field-error" role="alert">{fields.current}</span>}
        </label>
        <label className="field"><span className="field-label">New password</span>
          <input type="password" autoComplete="new-password" value={form.next} onChange={set('next')} maxLength={72} required />
          {fields.next && <span className="field-error" role="alert">{fields.next}</span>}
        </label>
        <label className="field"><span className="field-label">Repeat new password</span>
          <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} maxLength={72} required />
          {fields.confirm && <span className="field-error" role="alert">{fields.confirm}</span>}
        </label>
        <button className="btn-primary" disabled={busy || !form.current || !form.next}>{busy ? 'Saving...' : 'Update password'}</button>
      </form>
    </section>
  )
}

function DeleteAccount({ onDeleted }) {
  const username = useSelector((st) => st.auth.user.username)
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api.delete('/users/me', { data: { password } })
      toast.success('Your account was deleted.')
      onDeleted()
    } catch (err) {
      setError(errorMessage(err)); setBusy(false)
    }
  }

  return (
    <section className="set-section danger-zone" aria-labelledby="set-del">
      <h2 id="set-del">Delete account</h2>
      <p>This permanently removes your profile, posts, comments and reshares. It cannot be undone.</p>
      {!open ? (
        <button className="btn-outline btn-danger" onClick={() => setOpen(true)}>Delete my account</button>
      ) : (
        <form className="set-form" onSubmit={submit}>
          <input className="sr-only" type="text" name="username" autoComplete="username" value={username} readOnly tabIndex={-1} aria-hidden="true" />
          <label className="field"><span className="field-label">Confirm with your password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            {error && <span className="field-error" role="alert">{error}</span>}
          </label>
          <div className="set-row">
            <button type="button" className="link-btn" onClick={() => { setOpen(false); setPassword(''); setError('') }}>Cancel</button>
            <button className="btn-danger-solid" disabled={busy || !password}>{busy ? 'Deleting...' : 'Delete forever'}</button>
          </div>
        </form>
      )}
    </section>
  )
}
