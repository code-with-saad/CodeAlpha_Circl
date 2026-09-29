import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Avatar from '../components/Avatar'
import { api, errorMessage } from '../lib/api'
import { timeAgo } from '../lib/time'
import { confirm, toast } from '../lib/feedback'
import './admin.css'

// The server checks the admin role on every request; this guard only keeps the UI tidy.
export default function AdminPage() {
  const role = useSelector((s) => s.auth.user?.role)
  if (role !== 'admin') return <Navigate to="/" replace />
  return <Admin />
}

const TABS = [['overview', 'Overview'], ['users', 'People'], ['posts', 'Posts']]

function Admin() {
  const [tab, setTab] = useState('overview')
  return (
    <>
      <h1 className="page-title">Admin</h1>
      <div className="feed-tabs admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className="feed-tab" onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'posts' && <Posts />}
    </>
  )
}

function Overview() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setError(errorMessage(e)))
  }, [])
  if (error) return <p className="profile-empty" role="alert">{error}</p>
  if (!stats) return <p className="profile-empty" role="status">Loading...</p>

  const rows = [
    ['People', stats.users, `${stats.newUsers24h} joined in the last day`],
    ['Posts', stats.posts, `${stats.newPosts24h} in the last day`],
    ['Comments', stats.comments, ''],
    ['Suspended', stats.banned, `${stats.admins} admin ${stats.admins === 1 ? 'account' : 'accounts'}`],
  ]
  return (
    <dl className="admin-stats">
      {rows.map(([label, value, note]) => (
        <div key={label} className="admin-stat">
          <dt>{label}</dt>
          <dd>{value}</dd>
          {note && <dd className="suggest-sub admin-note">{note}</dd>}
        </div>
      ))}
    </dl>
  )
}

// Loads a cursor-paginated admin list; `reload` restarts from the top.
function usePaged(path, params) {
  const key = JSON.stringify(params)
  const [state, setState] = useState({ items: [], cursor: null, hasMore: false, loading: true, error: '' })

  const fetchPage = useCallback((cursor) => api.get(path, { params: { ...JSON.parse(key), cursor } }).then((r) => r.data), [path, key])

  useEffect(() => {
    let live = true
    fetchPage()
      .then((d) => live && setState({ items: d.users || d.posts, cursor: d.nextCursor, hasMore: !!d.nextCursor, loading: false, error: '' }))
      .catch((e) => live && setState((s) => ({ ...s, loading: false, error: errorMessage(e) })))
    return () => { live = false }
  }, [fetchPage])

  function more() {
    setState((s) => ({ ...s, loading: true }))
    fetchPage(state.cursor)
      .then((d) => setState((s) => ({ items: [...s.items, ...(d.users || d.posts)], cursor: d.nextCursor, hasMore: !!d.nextCursor, loading: false, error: '' })))
      .catch((e) => setState((s) => ({ ...s, loading: false, error: errorMessage(e) })))
  }
  const patch = (fn) => setState((s) => ({ ...s, items: fn(s.items) }))
  return { ...state, more, patch }
}

function Users() {
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const list = usePaged('/admin/users', { q: term })

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  async function ban(u) {
    if (!u.banned) {
      const ok = await confirm({ title: `Suspend @${u.username}?`, message: 'They will be signed out and cannot log in until you restore them.', confirmLabel: 'Suspend', danger: true })
      if (!ok) return
    }
    try {
      const { data } = await api.patch(`/admin/users/${u.id}`, { banned: !u.banned })
      list.patch((items) => items.map((x) => (x.id === u.id ? data.user : x)))
      toast.success(u.banned ? `@${u.username} restored` : `@${u.username} suspended`)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  async function remove(u) {
    const ok = await confirm({ title: `Delete @${u.username}?`, message: 'Their profile, posts, comments and reshares are removed for good. This cannot be undone.', confirmLabel: 'Delete person', danger: true })
    if (!ok) return
    try {
      await api.delete(`/admin/users/${u.id}`)
      list.patch((items) => items.filter((x) => x.id !== u.id))
      toast.success(`@${u.username} deleted`)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <>
      <div className="admin-search">
        <label className="sr-only" htmlFor="admin-q">Search people</label>
        <input id="admin-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or email" />
      </div>
      {list.error && <p className="field-error admin-pad" role="alert">{list.error}</p>}
      {list.items.map((u) => (
        <div key={u.id} className={`admin-row${u.banned ? ' is-banned' : ''}`}>
          <Avatar user={u} size={40} />
          <div className="admin-row-main">
            <strong>{u.displayName}</strong>
            <span className="suggest-sub">@{u.username} · {u.email}</span>
            <span className="suggest-sub">
              {u.followersCount} followers · joined {timeAgo(u.createdAt)} ago
              {u.role === 'admin' && <span className="badge"> admin</span>}
              {u.banned && <span className="badge badge-warn"> suspended</span>}
            </span>
          </div>
          {u.role !== 'admin' && (
            <div className="admin-actions">
              <button className="btn-outline btn-sm" onClick={() => ban(u)}>{u.banned ? 'Restore' : 'Suspend'}</button>
              <button className="btn-outline btn-sm btn-danger" onClick={() => remove(u)}>Delete</button>
            </div>
          )}
        </div>
      ))}
      {list.loading && <p className="profile-empty" role="status">Loading...</p>}
      {!list.loading && !list.items.length && <p className="profile-empty">No one matches.</p>}
      {list.hasMore && !list.loading && <button className="btn-outline feed-more" onClick={list.more}>Show more</button>}
    </>
  )
}

function Posts() {
  const list = usePaged('/admin/posts', {})

  async function remove(p) {
    const ok = await confirm({ title: 'Delete this post?', message: 'Its comments and reshares are removed too. This cannot be undone.', confirmLabel: 'Delete post', danger: true })
    if (!ok) return
    try {
      await api.delete(`/admin/posts/${p.id}`)
      list.patch((items) => items.filter((x) => x.id !== p.id))
      toast.success('Post deleted')
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <>
      {list.error && <p className="field-error admin-pad" role="alert">{list.error}</p>}
      {list.items.map((p) => (
        <div key={p.id} className="admin-row">
          <Avatar user={p.author} size={40} />
          <div className="admin-row-main">
            <span><strong>{p.author.displayName}</strong> <span className="suggest-sub">@{p.author.username} · {timeAgo(p.createdAt)}</span></span>
            <span className="admin-snippet">{p.isRepost && !p.text ? 'Reshare' : p.text || 'Photo'}{p.image ? ' [photo]' : ''}</span>
            <span className="suggest-sub">{p.likesCount} likes · {p.commentsCount} comments</span>
          </div>
          <div className="admin-actions">
            <button className="btn-outline btn-sm btn-danger" onClick={() => remove(p)}>Delete</button>
          </div>
        </div>
      ))}
      {list.loading && <p className="profile-empty" role="status">Loading...</p>}
      {list.hasMore && !list.loading && <button className="btn-outline feed-more" onClick={list.more}>Show more</button>}
    </>
  )
}
