import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import PostCard from '../components/PostCard'
import { api, errorMessage } from '../lib/api'
import { timeAgo } from '../lib/time'
import '../components/post.css'
import './profile.css'

export default function PostPage() {
  const { id } = useParams()
  return <Thread key={id} id={id} />
}

function Thread({ id }) {
  const navigate = useNavigate()
  const me = useSelector((s) => s.auth.user)
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [status, setStatus] = useState('loading')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    Promise.all([api.get(`/posts/${id}`), api.get(`/posts/${id}/comments`)])
      .then(([p, c]) => { if (live) { setPost(p.data.post); setComments(c.data.comments); setStatus('ok') } })
      .catch((e) => live && setStatus(e.response?.status === 404 ? 'missing' : 'error'))
    return () => { live = false }
  }, [id])

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const { data } = await api.post(`/posts/${id}/comments`, { text })
      setComments((c) => [...c, data.comment])
      setPost((p) => ({ ...p, commentsCount: p.commentsCount + 1 }))
      setText('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  async function removeComment(c) {
    try {
      await api.delete(`/comments/${c.id}`)
      setComments((list) => list.filter((x) => x.id !== c.id))
      setPost((p) => ({ ...p, commentsCount: Math.max(0, p.commentsCount - 1) }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <div className="edit-bar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={24} /></button>
        <h1 className="edit-title">Post</h1>
      </div>

      {status === 'loading' && <p className="feed-note" role="status">Loading...</p>}
      {status === 'missing' && <p className="feed-note">This post is gone.</p>}
      {status === 'error' && <p className="feed-note" role="alert">Could not load this post.</p>}

      {status === 'ok' && (
        <>
          <PostCard post={post} detail onRemoved={() => navigate('/', { replace: true })} />

          <form className="comment-form" onSubmit={send}>
            <Avatar user={me} size={36} />
            <label className="sr-only" htmlFor="comment-text">Add a comment</label>
            <textarea id="comment-text" rows={1} value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" />
            <button className="composer-post" disabled={!text.trim() || sending}>Reply</button>
          </form>
          {error && <p className="field-error" role="alert" style={{ padding: '0 var(--s4)' }}>{error}</p>}

          <section className="comments" aria-label="Comments">
            {comments.map((c) => (
              <article key={c.id} className="comment">
                <Link to={`/u/${c.author.username}`} className="comment-avatar" aria-label={`${c.author.displayName}'s profile`}><Avatar user={c.author} size={36} /></Link>
                <div className="post-body">
                  <header className="post-meta">
                    <Link to={`/u/${c.author.username}`} className="post-name">{c.author.displayName}</Link>
                    <span className="post-handle">@{c.author.username}</span>
                    <span className="post-time"><span aria-hidden="true">·</span> {timeAgo(c.createdAt)}</span>
                  </header>
                  <p className="comment-text">{c.text}</p>
                </div>
                {(c.author.id === me.id || post.author.id === me.id) && (
                  <button className="post-action post-delete" style={{ marginLeft: 0 }} onClick={() => removeComment(c)} aria-label="Delete comment"><Trash size={20} /></button>
                )}
              </article>
            ))}
            {!comments.length && <p className="feed-note">No comments yet.</p>}
          </section>
        </>
      )}
    </>
  )
}
