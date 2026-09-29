import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { uploadImage, validateImage } from '../lib/cloudinary'
import { userUpdated } from '../features/auth/authSlice'
import './profile.css'
import './auth.css'

export default function EditProfilePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const me = useSelector((s) => s.auth.user)
  const fileRef = useRef(null)
  const [form, setForm] = useState({ displayName: me.displayName, bio: me.bio })
  const [avatar, setAvatar] = useState(me.avatar)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = validateImage(file)
    if (problem) return setError(problem)
    setError('')
    setBusy(true)
    try {
      setAvatar(await uploadImage(file, 'avatar'))
    } catch (err) {
      setError(err.message || errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setFields({})
    try {
      const { data } = await api.patch('/users/me', { ...form, avatar })
      dispatch(userUpdated(data.user))
      navigate(`/u/${data.user.username}`)
    } catch (err) {
      setError(errorMessage(err))
      setFields(fieldErrors(err))
      setBusy(false)
    }
  }

  return (
    <div className="edit">
      <div className="edit-bar">
        <Link to={`/u/${me.username}`} className="icon-btn" aria-label="Back to profile"><ArrowLeft size={24} /></Link>
        <h1 className="edit-title">Edit profile</h1>
      </div>

      <form className="auth-form edit-form" onSubmit={submit} noValidate>
        <div className="edit-avatar">
          <Avatar user={{ ...me, avatar }} size={96} />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} hidden />
          <button type="button" className="btn-outline" onClick={() => fileRef.current.click()} disabled={busy}>
            <Camera size={20} /> Change photo
          </button>
          {avatar && <button type="button" className="link-btn" onClick={() => setAvatar('')}>Remove</button>}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <label className="field">
          <span className="field-label">Name</span>
          <input value={form.displayName} onChange={set('displayName')} maxLength={40} />
          {fields.displayName && <span className="field-error" role="alert">{fields.displayName}</span>}
        </label>

        <label className="field">
          <span className="field-label">Bio</span>
          <textarea value={form.bio} onChange={set('bio')} maxLength={160} rows={3} />
          <span className="field-hint">{form.bio.length}/160</span>
          {fields.bio && <span className="field-error" role="alert">{fields.bio}</span>}
        </label>

        <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
      </form>
    </div>
  )
}
