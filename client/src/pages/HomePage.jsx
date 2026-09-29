import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Composer from '../components/Composer'
import PostCard from '../components/PostCard'
import { fetchFeed } from '../features/feed/feedSlice'
import '../components/post.css'

const TABS = [['everyone', 'Everyone'], ['following', 'Following']]

export default function HomePage() {
  const dispatch = useDispatch()
  const followingCount = useSelector((s) => s.auth.user.followingCount)
  // New accounts follow nobody, so start them on Everyone rather than an empty feed.
  const [tab, setTab] = useState(followingCount > 0 ? 'following' : 'everyone')
  const feed = useSelector((s) => s.feed[tab])
  const sentinel = useRef(null)

  useEffect(() => {
    if (feed.status === 'idle') dispatch(fetchFeed({ tab, reset: true }))
  }, [tab, feed.status, dispatch])

  useEffect(() => {
    const el = sentinel.current
    if (!el || !feed.hasMore || feed.status !== 'ready') return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && dispatch(fetchFeed({ tab })), { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [tab, feed.hasMore, feed.status, feed.cursor, dispatch])

  return (
    <>
      <h1 className="sr-only">Home</h1>
      <div className="feed-tabs" role="tablist" aria-label="Feed">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className="feed-tab" onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <Composer className="composer-inline" />

      {feed.items.map((p) => <PostCard key={p.id} post={p} />)}

      {feed.status === 'loading' && !feed.items.length && <p className="feed-note" role="status">Loading...</p>}
      {feed.status === 'error' && (
        <p className="feed-note" role="alert">
          {feed.error} <button className="link-btn" onClick={() => dispatch(fetchFeed({ tab, reset: !feed.items.length }))}>Retry</button>
        </p>
      )}
      {feed.status === 'ready' && !feed.items.length && (
        <p className="feed-note">
          {tab === 'following' ? 'Nobody you follow has posted yet. Try the Everyone tab to find people.' : 'No posts yet. Be the first.'}
        </p>
      )}
      {feed.hasMore && feed.status === 'ready' && <div ref={sentinel} style={{ height: 1 }} />}
      {feed.status === 'loading' && feed.items.length > 0 && <p className="feed-note" role="status">Loading more...</p>}
    </>
  )
}
