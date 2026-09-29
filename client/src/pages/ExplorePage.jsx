import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import FollowButton from '../components/FollowButton'
import { SuggestedList, TrendingList } from '../components/Discover'
import { api } from '../lib/api'
import '../components/discover.css'

export default function ExplorePage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    let live = true
    // Wait for a pause in typing so we do not query on every keystroke.
    const t = setTimeout(() => {
      api.get('/users/search', { params: { q: term } })
        .then((r) => live && setResults(r.data.users))
        .catch(() => live && setResults([]))
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [q])

  // Short queries never hit the server, so any earlier results are hidden rather than cleared.
  const shown = q.trim().length >= 2 ? results : null

  const setFollowing = (id) => (isFollowing) =>
    setResults((list) => list.map((u) => (u.id === id ? { ...u, isFollowing } : u)))

  return (
    <div className="explore-pad">
      <h1 className="page-title" style={{ padding: '0 0 var(--s4)' }}>Explore</h1>
      <div className="search" role="search">
        <label className="sr-only" htmlFor="user-search">Search people</label>
        <input id="user-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" autoComplete="off" />
      </div>

      {shown ? (
        <section aria-label="Search results">
          {!shown.length && <p className="rail-note">No one found for "{q.trim()}".</p>}
          {shown.map((u) => (
            <div key={u.id} className="suggest-row">
              <Link to={`/u/${u.username}`} className="suggest-main">
                <Avatar user={u} size={40} />
                <span className="suggest-text"><strong>{u.displayName}</strong><span className="suggest-sub">@{u.username}</span></span>
              </Link>
              {!u.isMe && <FollowButton username={u.username} isFollowing={u.isFollowing} onChange={setFollowing(u.id)} />}
            </div>
          ))}
        </section>
      ) : (
        <>
          <div className="rail-section"><TrendingList label="Trending topics" /></div>
          {/* The right rail already shows suggestions on wide screens */}
          <div className="rail-section explore-suggested"><SuggestedList label="People to follow" /></div>
        </>
      )}
    </div>
  )
}
