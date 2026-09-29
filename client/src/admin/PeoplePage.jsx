import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowCounterClockwise, DownloadSimple, MagnifyingGlass, Prohibit, Trash } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import { api, errorMessage } from '../lib/api'
import { confirm, toast } from '../lib/feedback'
import { ago } from '../lib/time'
import { downloadExport, useAdminList } from './shared'
import { fmt } from './format'

export default function PeoplePage() {
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const list = useAdminList('/admin/users', { q: term, status, role }, (d) => d.users)

  // Wait for a pause in typing before querying.
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
      list.patch((items) => items.map((x) => (x.id === u.id ? { ...x, banned: data.user.banned } : x)))
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
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">People</h1>
          <p className="adm-sub">Search, suspend and manage accounts</p>
        </div>
        <div className="adm-tools">
          <button className="btn-outline" onClick={() => downloadExport('users')}><DownloadSimple size={18} aria-hidden="true" /> Export CSV</button>
        </div>
      </header>

      <div className="filters">
        <label className="filter-search">
          <MagnifyingGlass size={20} aria-hidden="true" />
          <span className="sr-only">Search people</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or email" />
        </label>
        <label className="filter"><span className="sr-only">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="filter"><span className="sr-only">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option><option value="user">Members</option><option value="admin">Admins</option>
          </select>
        </label>
      </div>

      {list.error && <p className="adm-empty" role="alert">{list.error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th scope="col">Person</th><th scope="col">Posts</th><th scope="col">Followers</th><th scope="col">Joined</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {list.items.map((u) => (
              <tr key={u.id} className={u.banned ? 'is-banned' : ''}>
                <td className="cell-person">
                  <Avatar user={u} size={40} />
                  <span className="cell-person-text">
                    <Link to={`/u/${u.username}`}><strong>{u.displayName}</strong></Link>
                    <span className="muted-sm">@{u.username}</span>
                    <span className="muted-sm">{u.email}</span>
                  </span>
                </td>
                <td data-label="Posts">{fmt(u.postsCount)}</td>
                <td data-label="Followers">{fmt(u.followersCount)}</td>
                <td data-label="Joined">{ago(u.createdAt)}</td>
                <td data-label="Status">
                  {u.role === 'admin' ? <span className="pill pill-ok">Admin</span> : u.banned ? <span className="pill pill-warn">Suspended</span> : <span className="pill">Active</span>}
                </td>
                <td className="cell-actions">
                  {u.role !== 'admin' && (
                    <>
                      <button className="btn-outline btn-sm" onClick={() => ban(u)}>
                        {u.banned ? <><ArrowCounterClockwise size={16} aria-hidden="true" /> Restore</> : <><Prohibit size={16} aria-hidden="true" /> Suspend</>}
                      </button>
                      <button className="btn-outline btn-sm btn-danger" onClick={() => remove(u)} aria-label={`Delete @${u.username}`}><Trash size={16} aria-hidden="true" /> Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {list.loading && <p className="adm-empty" role="status">Loading...</p>}
      {!list.loading && !list.items.length && !list.error && <p className="adm-empty">No one matches these filters.</p>}
      {list.hasMore && !list.loading && <button className="btn-outline adm-more-btn" onClick={list.more}>Show more</button>}
    </div>
  )
}
