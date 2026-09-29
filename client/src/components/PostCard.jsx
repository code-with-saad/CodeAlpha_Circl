import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { BookmarkSimple, ChatCircle, Heart, Repeat, ShareNetwork, Trash } from '@phosphor-icons/react'
import Avatar from './Avatar'
import PostText from './PostText'
import { api, errorMessage } from '../lib/api'
import { fit } from '../lib/cloudinary'
import { timeAgo } from '../lib/time'
import { feedStale, postPatched, postRemoved } from '../features/feed/feedSlice'
import './post.css'

export default function PostCard({ post, detail = false, onRemoved }) {
  const dispatch = useDispatch()
  const meId = useSelector((s) => s.auth.user?.id)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [menu, setMenu] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [quote, setQuote] = useState('')
  const menuRef = useRef(null)
  // Optimistic copy of the fields the buttons change; reverted if the request fails.
  const [live, setLive] = useState({
    liked: post.liked, likesCount: post.likesCount, saved: post.saved, reshared: post.reshared, repostsCount: post.repostsCount,
  })
  const { author, repostOf } = post
  const mine = author.id === meId

  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !menuRef.current?.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [menu])

  function flash(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2200)
  }

  async function toggle(kind) {
    const before = live
    const on = kind === 'like' ? !live.liked : !live.saved
    const next = kind === 'like'
      ? { ...live, liked: on, likesCount: live.likesCount + (on ? 1 : -1) }
      : { ...live, saved: on }
    setLive(next)
    setError('')
    try {
      await api({ method: on ? 'post' : 'delete', url: `/posts/${post.id}/${kind === 'like' ? 'like' : 'save'}` })
      dispatch(postPatched({ id: post.id, ...next }))
    } catch (e) {
      setLive(before)
      setError(errorMessage(e))
    }
  }

  async function reshare(withText) {
    const undo = live.reshared && !withText
    setMenu(false)
    setError('')
    try {
      const { data } = await api({
        method: undo ? 'delete' : 'post',
        url: `/posts/${post.id}/reshare`,
        data: withText ? { text: withText } : {},
      })
      setLive((l) => ({ ...l, reshared: data.reshared, repostsCount: data.repostsCount }))
      setQuoting(false)
      setQuote('')
      dispatch(feedStale())
      flash(undo ? 'Reshare removed' : withText ? 'Quote posted' : 'Reshared')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  async function share() {
    const target = repostOf ? repostOf.id : post.id
    const url = `${window.location.origin}/post/${target}`
    try {
      if (navigator.share) await navigator.share({ url, text: (repostOf?.text || post.text).slice(0, 100) })
      else { await navigator.clipboard.writeText(url); flash('Link copied') }
    } catch (e) {
      if (e.name !== 'AbortError') flash('Could not share')
    }
  }

  async function remove() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    try {
      await api.delete(`/posts/${post.id}`)
      dispatch(postRemoved(post.id))
      onRemoved?.(post.id)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <article className={`post${detail ? ' post-detail' : ''}`}>
      <Link to={`/u/${author.username}`} className="post-avatar" aria-label={`${author.displayName}'s profile`}>
        <Avatar user={author} size={detail ? 48 : 44} />
      </Link>
      <div className="post-body">
        <header className="post-meta">
          <Link to={`/u/${author.username}`} className="post-name">{author.displayName}</Link>
          <span className="post-handle">@{author.username}</span>
          <Link to={`/post/${post.id}`} className="post-time" title={new Date(post.createdAt).toLocaleString()}>
            <span aria-hidden="true">·</span> {timeAgo(post.createdAt)}
          </Link>
        </header>

        {post.isRepost && !post.text && <p className="post-reshared"><Repeat size={16} /> reshared</p>}
        {post.text && <PostText text={post.text} />}
        {post.image && <img className="post-image" src={fit(post.image, detail ? 1200 : 900)} alt="" loading="lazy" />}

        {post.isRepost && (
          repostOf ? (
            <Link to={`/post/${repostOf.id}`} className="post-embed">
              <span className="post-embed-head">
                <Avatar user={repostOf.author} size={22} />
                <strong>{repostOf.author.displayName}</strong>
                <span className="post-handle">@{repostOf.author.username}</span>
              </span>
              {repostOf.text && <span className="post-embed-text">{repostOf.text}</span>}
              {repostOf.image && <img className="post-image" src={fit(repostOf.image, 700)} alt="" loading="lazy" />}
            </Link>
          ) : <p className="post-embed post-embed-gone">This post is no longer available.</p>
        )}

        <footer className="post-actions">
          <Link to={`/post/${post.id}`} className="post-action" aria-label={`${post.commentsCount} comments`}>
            <ChatCircle size={22} /> <span>{post.commentsCount}</span>
          </Link>

          <span className="post-menu-wrap" ref={menuRef}>
            <button
              className={`post-action post-reshare${live.reshared ? ' on' : ''}`}
              onClick={() => setMenu((m) => !m)}
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label={`Reshare options, ${live.repostsCount} reshares`}
            >
              <Repeat size={22} weight={live.reshared ? 'bold' : 'regular'} /> <span>{live.repostsCount}</span>
            </button>
            {menu && (
              <div className="menu" role="menu">
                <button role="menuitem" onClick={() => reshare()}>{live.reshared ? 'Undo reshare' : 'Reshare'}</button>
                <button role="menuitem" onClick={() => { setMenu(false); setQuoting(true) }}>Quote</button>
              </div>
            )}
          </span>

          <button className={`post-action post-like${live.liked ? ' on' : ''}`} onClick={() => toggle('like')} aria-pressed={live.liked} aria-label={`Like, ${live.likesCount} likes`}>
            <Heart size={22} weight={live.liked ? 'fill' : 'regular'} /> <span>{live.likesCount}</span>
          </button>
          <button className={`post-action post-save${live.saved ? ' on' : ''}`} onClick={() => toggle('save')} aria-pressed={live.saved} aria-label={live.saved ? 'Remove from saved' : 'Save post'}>
            <BookmarkSimple size={22} weight={live.saved ? 'fill' : 'regular'} />
          </button>
          <button className="post-action" onClick={share} aria-label="Share post"><ShareNetwork size={22} /></button>
          {mine && (
            <button className="post-action post-delete" onClick={remove} aria-label="Delete post"><Trash size={22} /></button>
          )}
        </footer>

        {quoting && (
          <form className="quote-form" onSubmit={(e) => { e.preventDefault(); if (quote.trim()) reshare(quote.trim()) }}>
            <label className="sr-only" htmlFor={`q-${post.id}`}>Add your thoughts</label>
            <textarea id={`q-${post.id}`} autoFocus value={quote} maxLength={500} onChange={(e) => setQuote(e.target.value)} placeholder="Add your thoughts" rows={2} />
            <div className="quote-actions">
              <button type="button" className="link-btn" onClick={() => setQuoting(false)}>Cancel</button>
              <button className="composer-post" disabled={!quote.trim()}>Quote</button>
            </div>
          </form>
        )}
        <p className="sr-only" role="status">{notice}</p>
        {notice && <p className="post-notice" aria-hidden="true">{notice}</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    </article>
  )
}
