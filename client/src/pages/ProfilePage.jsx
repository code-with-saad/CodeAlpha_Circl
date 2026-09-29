import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Flag } from '@phosphor-icons/react'
import FollowButton from '../components/FollowButton'
import ReportDialog from '../components/ReportDialog'
import Avatar from '../components/Avatar'
import PostCard from '../components/PostCard'
import { usePagedPosts } from '../lib/usePagedPosts'
import '../components/post.css'
import { api } from '../lib/api'
import './profile.css'

export function MeRedirect() {
  const username = useSelector((s) => s.auth.user?.username)
  return <Navigate to={`/u/${username}`} replace />
}

export default function ProfilePage() {
  const { username } = useParams()
  // Keyed so navigating between profiles remounts with fresh loading state.
  return <Profile key={username} username={username} />
}

function Profile({ username }) {
  const me = useSelector((s) => s.auth.user)
  const [state, setState] = useState({ status: 'loading', user: null })
  const [reporting, setReporting] = useState(false)
  const posts = usePagedPosts(`/users/${username}/posts`)

  useEffect(() => {
    let live = true
    api.get(`/users/${username}`)
      .then((r) => live && setState({ status: 'ok', user: r.data.user }))
      .catch((e) => live && setState({ status: e.response?.status === 404 ? 'missing' : 'error', user: null }))
    return () => { live = false }
  }, [username])

  if (state.status === 'loading') return <div className="profile-skel" aria-busy="true" aria-label="Loading profile" />
  if (state.status === 'missing') return <p className="profile-empty">No one here by that name.</p>
  if (state.status === 'error') return <p className="profile-empty">Could not load this profile. Refresh to try again.</p>

  // Follow state is applied instantly, then reconciled with the server's count.
  function onFollowChange(isFollowing, followersCount) {
    setState((s) => {
      const u = s.user
      const count = followersCount ?? Math.max(0, u.followersCount + (isFollowing === u.isFollowing ? 0 : isFollowing ? 1 : -1))
      return { ...s, user: { ...u, isFollowing, followersCount: count } }
    })
  }

  // The owner's own edits live in the store, so prefer that copy for their page.
  const user = state.user.isMe && me ? { ...state.user, ...me } : state.user

  return (
    <article>
      <header className="profile-head">
        <Avatar user={user} size={96} />
        <div className="profile-id">
          <h1 className="profile-name">{user.displayName}</h1>
          <p className="profile-handle">@{user.username}</p>
        </div>
        {user.isMe
          ? <Link to="/edit-profile" className="btn-outline">Edit profile</Link>
          : (
            <>
              <FollowButton username={user.username} isFollowing={user.isFollowing} onChange={onFollowChange} />
              {user.role !== 'admin' && (
                <button className="icon-btn" onClick={() => setReporting(true)} aria-label={`Report @${user.username}`}><Flag size={22} /></button>
              )}
            </>
          )}
      </header>

      {reporting && <ReportDialog type="user" id={user.id} label={`@${user.username}`} onClose={() => setReporting(false)} />}

      {user.bio && <p className="profile-bio">{user.bio}</p>}

      <div className="profile-counts">
        <Link to={`/u/${user.username}/followers`}><b>{user.followersCount}</b><span>{user.followersCount === 1 ? 'follower' : 'followers'}</span></Link>
        <Link to={`/u/${user.username}/following`}><b>{user.followingCount}</b><span>following</span></Link>
      </div>

      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        <button role="tab" aria-selected="true" className="profile-tab">Posts</button>
      </div>
      {posts.items.map((p) => <PostCard key={p.id} post={p} onRemoved={posts.remove} />)}
      {posts.error && <p className="profile-empty" role="alert">{posts.error}</p>}
      {!posts.loading && !posts.error && !posts.items.length && (
        <p className="profile-empty">{user.isMe ? 'Nothing posted yet. Your first post will show up here.' : 'No posts yet.'}</p>
      )}
      {posts.hasMore && posts.items.length > 0 && <button className="btn-outline feed-more" onClick={posts.loadMore} disabled={posts.loading}>{posts.loading ? 'Loading...' : 'Show more'}</button>}
    </article>
  )
}
