import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import FollowButton from '../components/FollowButton'
import { api } from '../lib/api'
import './profile.css'

export default function UsersListPage({ kind }) {
  const { username } = useParams()
  return <List key={`${username}/${kind}`} username={username} kind={kind} />
}

function List({ username, kind }) {
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', users: [] })

  useEffect(() => {
    let live = true
    api.get(`/users/${username}/${kind}`)
      .then((r) => live && setState({ status: 'ok', users: r.data.users }))
      .catch(() => live && setState({ status: 'error', users: [] }))
    return () => { live = false }
  }, [username, kind])

  const setFollowing = (id) => (isFollowing) =>
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, isFollowing } : u)) }))

  return (
    <>
      <div className="edit-bar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={24} /></button>
        <h1 className="edit-title">{kind === 'followers' ? 'Followers' : 'Following'} <span className="muted">@{username}</span></h1>
      </div>
      {state.status === 'loading' && <p className="profile-empty" role="status">Loading...</p>}
      {state.status === 'error' && <p className="profile-empty" role="alert">Could not load this list.</p>}
      {state.status === 'ok' && !state.users.length && (
        <p className="profile-empty">{kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
      )}
      {state.users.map((u) => (
        <div key={u.id} className="user-row">
          <Link to={`/u/${u.username}`} className="user-row-main">
            <Avatar user={u} size={44} />
            <span className="user-row-text">
              <strong>{u.displayName}</strong>
              <span className="post-handle">@{u.username}</span>
              {u.bio && <span className="user-row-bio">{u.bio}</span>}
            </span>
          </Link>
          {!u.isMe && <FollowButton username={u.username} isFollowing={u.isFollowing} onChange={setFollowing(u.id)} />}
        </div>
      ))}
    </>
  )
}
