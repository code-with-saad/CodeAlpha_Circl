import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Image as ImageIcon, X } from '@phosphor-icons/react'
import Avatar from './Avatar'
import { api, errorMessage } from '../lib/api'
import { fit, uploadImage, validateImage } from '../lib/cloudinary'
import { toast } from '../lib/feedback'
import { postCreated } from '../features/feed/feedSlice'
import './post.css'

const MAX = 500

export default function Composer({ onDone, className = '', autoFocus = false }) {
  const dispatch = useDispatch()
  const me = useSelector((s) => s.auth.user)
  const fileRef = useRef(null)
  const [text, setText] = useState('')
  const [image, setImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)

  const left = MAX - text.length
  const canPost = (text.trim() || image) && left >= 0 && !uploading && !posting

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = validateImage(file)
    if (problem) return toast.error(problem)
    setUploading(true)
    try {
      setImage(await uploadImage(file, 'post'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!canPost) return
    setPosting(true)
    try {
      const { data } = await api.post('/posts', { text, image })
      dispatch(postCreated(data.post))
      setText('')
      setImage('')
      toast.success('Posted')
      onDone?.(data.post)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  return (
    <form className={`composer ${className}`} onSubmit={submit}>
      <Avatar user={me} size={44} />
      <div className="composer-main">
        <label className="sr-only" htmlFor="composer-text">What is on your mind?</label>
        <textarea id="composer-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="What is on your mind?" autoFocus={autoFocus} />
        {image && (
          <div className="composer-preview">
            <img src={fit(image, 800)} alt="Attached preview" />
            <button type="button" className="composer-remove" onClick={() => setImage('')} aria-label="Remove photo"><X size={18} weight="bold" /></button>
          </div>
        )}
        <div className="composer-bar">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} hidden />
          <button type="button" className="icon-btn" onClick={() => fileRef.current.click()} disabled={uploading || !!image} aria-label="Add photo">
            <ImageIcon size={24} />
          </button>
          {uploading && <span className="composer-count">Uploading...</span>}
          {!uploading && <span className={`composer-count${left < 0 ? ' over' : ''}`}>{left < 60 ? left : ''}</span>}
          <button className="composer-post" disabled={!canPost}>{posting ? 'Posting...' : 'Post'}</button>
        </div>
      </div>
    </form>
  )
}
