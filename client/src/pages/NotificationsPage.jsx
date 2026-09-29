import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { ChatCircle, Heart, Quotes, Repeat, UserPlus } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import { api, errorMessage } from '../lib/api'
import { timeAgo } from '../lib/time'
import { unreadCleared } from '../features/notifications/notificationsSlice'
import './notifications.css'

const KINDS = {
  like: { Icon: Heart, verb: 'liked your post', tone: 'accent' },
  comment: { Icon: ChatCircle, verb: 'commented on your post', tone: 'ink' },
  follow: { Icon: UserPlus, verb: 'started following you', tone: 'moss' },
  reshare: { Icon: Repeat, verb: 'reshared your post', tone: 'moss' },
  quote: { Icon: Quotes, verb: 'quoted your post', tone: 'moss' },
}

export default function NotificationsPage() {
  const dispatch = useDispatch()
  const unread = useSelector((s) => s.notifications.unread)
  const [state, setState] = useState({ items: [], cursor: null, status: 'loading', error: '' })
  const loaded = useRef(false)
  const hasUnread = unread > 0

  // Runs on mount, and again when the header poll reports new items while this page is open.
  useEffect(() => {
    if (loaded.current && !hasUnread) return
    let live = true
    api.get('/notifications')
      .then(async ({ data }) => {
        if (!live) return
        setState({ items: data.notifications, cursor: data.nextCursor, status: 'ok', error: '' })
        loaded.current = true
        // Keep the unread markers we just fetched on screen, but clear the badge.
        if (data.notifications.some((n) => !n.read)) await api.post('/notifications/read')
        dispatch(unreadCleared())
      })
      .catch((e) => live && setState((s) => ({ ...s, status: loaded.current ? 'ok' : 'error', error: errorMessage(e) })))
    return () => { live = false }
  }, [hasUnread, dispatch])

  async function more() {
    try {
      const { data } = await api.get('/notifications', { params: { cursor: state.cursor } })
      setState((s) => ({ ...s, items: [...s.items, ...data.notifications], cursor: data.nextCursor }))
    } catch (e) {
      setState((s) => ({ ...s, error: errorMessage(e) }))
    }
  }

  return (
    <>
      <h1 className="page-title">Alerts</h1>
      {state.status === 'loading' && <p className="profile-empty" role="status">Loading...</p>}
      {state.status === 'error' && <p className="profile-empty" role="alert">{state.error}</p>}
      {state.status === 'ok' && !state.items.length && (
        <p className="profile-empty">Nothing yet. Likes, comments, follows and reshares will show up here.</p>
      )}
      <ul className="notes">
        {state.items.map((n) => {
          const { Icon, verb, tone } = KINDS[n.type]
          const to = n.post ? `/post/${n.post.id}` : `/u/${n.actor.username}`
          return (
            <li key={n.id}>
              <Link to={to} className={`note${n.read ? '' : ' unread'}`}>
                <span className={`note-icon tone-${tone}`}><Icon size={18} weight="fill" aria-hidden="true" /></span>
                <Avatar user={n.actor} size={36} />
                <span className="note-body">
                  <span><strong>{n.actor.displayName}</strong> {verb}{!n.read && <span className="sr-only"> (new)</span>}</span>
                  {(n.text || n.post?.text) && (
                    <span className="note-snippet">{n.type === 'comment' || n.type === 'quote' ? n.text : n.post.text}</span>
                  )}
                </span>
                <time className="note-time" dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
              </Link>
            </li>
          )
        })}
      </ul>
      {state.cursor && <button className="btn-outline feed-more" onClick={more}>Show more</button>}
    </>
  )
}
