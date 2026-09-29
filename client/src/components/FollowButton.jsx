import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Check } from '@phosphor-icons/react'
import { api } from '../lib/api'
import { followingChanged } from '../features/auth/authSlice'

// Optimistic follow toggle. `onChange(isFollowing, followersCount?)` lets the parent update its own numbers.
export default function FollowButton({ username, isFollowing, onChange }) {
  const dispatch = useDispatch()
  const [busy, setBusy] = useState(false)

  async function click() {
    if (busy) return
    const next = !isFollowing
    setBusy(true)
    onChange(next)
    try {
      const { data } = await api({ method: next ? 'post' : 'delete', url: `/users/${username}/follow` })
      onChange(data.isFollowing, data.followersCount)
      dispatch(followingChanged(next ? 1 : -1))
    } catch {
      onChange(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className={isFollowing ? 'btn-following' : 'btn-follow'}
      onClick={click}
      aria-pressed={isFollowing}
      aria-label={`${isFollowing ? 'Unfollow' : 'Follow'} @${username}`}
    >
      {isFollowing ? <><Check size={16} weight="bold" /> Following</> : 'Follow'}
    </button>
  )
}
