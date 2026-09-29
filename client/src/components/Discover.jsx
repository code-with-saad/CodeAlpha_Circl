import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import FollowButton from './FollowButton'
import { api } from '../lib/api'
import './discover.css'

function useFetch(url, pick) {
  const [state, setState] = useState({ status: 'loading', data: [] })
  useEffect(() => {
    let live = true
    api.get(url)
      .then((r) => live && setState({ status: 'ok', data: pick(r.data) }))
      .catch(() => live && setState({ status: 'error', data: [] }))
    return () => { live = false }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps
  return [state, setState]
}

export function SuggestedList({ title = 'Suggested for you', label = title }) {
  const [state, setState] = useFetch('/users/suggested', (d) => d.users)
  const setFollowing = (id) => (isFollowing) =>
    setState((s) => ({ ...s, data: s.data.map((u) => (u.id === id ? { ...u, isFollowing } : u)) }))

  return (
    <section aria-label={label}>
      <h2 className="rail-title">{title}</h2>
      {state.status === 'loading' && <p className="rail-note" role="status">Loading...</p>}
      {state.status === 'error' && <p className="rail-note">Could not load suggestions.</p>}
      {state.status === 'ok' && !state.data.length && <p className="rail-note">You are following everyone. Impressive.</p>}
      {state.data.map((u) => (
        <div key={u.id} className="suggest-row">
          <Link to={`/u/${u.username}`} className="suggest-main">
            <Avatar user={u} size={40} />
            <span className="suggest-text">
              <strong>{u.displayName}</strong>
              <span className="suggest-sub">
                {u.mutual > 0 ? `${u.mutual} mutual ${u.mutual === 1 ? 'follow' : 'follows'}` : `@${u.username}`}
              </span>
            </span>
          </Link>
          <FollowButton username={u.username} isFollowing={u.isFollowing} onChange={setFollowing(u.id)} />
        </div>
      ))}
    </section>
  )
}

export function TrendingList({ title = 'Trending', label = title }) {
  const [state] = useFetch('/posts/trending', (d) => d.tags)
  return (
    <section aria-label={label}>
      <h2 className="rail-title">{title}</h2>
      {state.status === 'loading' && <p className="rail-note" role="status">Loading...</p>}
      {state.status === 'error' && <p className="rail-note">Could not load trends.</p>}
      {state.status === 'ok' && !state.data.length && <p className="rail-note">Nothing trending yet. Use a #hashtag in a post.</p>}
      {state.data.map((t, i) => (
        <Link key={t.tag} to={`/tag/${t.tag}`} className="trend-row">
          <span className="trend-rank" aria-hidden="true">{i + 1}</span>
          <span className="trend-text">
            <strong>#{t.tag}</strong>
            <span className="suggest-sub">{t.posts} {t.posts === 1 ? 'post' : 'posts'} in the last 2 days</span>
          </span>
        </Link>
      ))}
    </section>
  )
}
