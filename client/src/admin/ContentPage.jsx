import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DownloadSimple, Flag, MagnifyingGlass, Trash } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import { api, errorMessage } from '../lib/api'
import { fit } from '../lib/cloudinary'
import { confirm, toast } from '../lib/feedback'
import { ago } from '../lib/time'
import { downloadExport, reportsChanged, useAdminList } from './shared'

const kind = (p) => (p.isRepost ? (p.text ? 'Quote' : 'Reshare') : p.image ? 'Photo' : 'Text')

export default function ContentPage() {
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [type, setType] = useState('')
  const list = useAdminList('/admin/posts', { q: term, type }, (d) => d.posts)

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  async function remove(p) {
    const ok = await confirm({ title: 'Delete this post?', message: 'Its comments and reshares are removed too. This cannot be undone.', confirmLabel: 'Delete post', danger: true })
    if (!ok) return
    try {
      await api.delete(`/admin/posts/${p.id}`)
      list.patch((items) => items.filter((x) => x.id !== p.id))
      toast.success('Post deleted')
      reportsChanged()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">Content</h1>
          <p className="adm-sub">Every post, newest first</p>
        </div>
        <div className="adm-tools">
          <button className="btn-outline" onClick={() => downloadExport('posts')}><DownloadSimple size={18} aria-hidden="true" /> Export CSV</button>
        </div>
      </header>

      <div className="filters">
        <label className="filter-search">
          <MagnifyingGlass size={20} aria-hidden="true" />
          <span className="sr-only">Search posts</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search post text" />
        </label>
        <label className="filter"><span className="sr-only">Post type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option><option value="text">Text only</option><option value="photo">With a photo</option><option value="reshare">Reshares and quotes</option>
          </select>
        </label>
      </div>

      {list.error && <p className="adm-empty" role="alert">{list.error}</p>}

      <ul className="content-list">
        {list.items.map((p) => (
          <li key={p.id} className="content-row">
            <Avatar user={p.author} size={40} />
            <div className="content-main">
              <span className="content-meta">
                <strong>{p.author.displayName}</strong> <span className="muted-sm">@{p.author.username} · {ago(p.createdAt)}</span>
                <span className="pill">{kind(p)}</span>
                {p.reportsCount > 0 && <span className="pill pill-warn"><Flag size={12} weight="fill" aria-hidden="true" /> {p.reportsCount} {p.reportsCount === 1 ? 'report' : 'reports'}</span>}
              </span>
              <span className="content-text">{p.text || (p.isRepost ? 'Reshared a post' : '(photo only)')}</span>
              <span className="muted-sm">{p.likesCount} likes · {p.commentsCount} comments</span>
            </div>
            {p.image && <img className="content-thumb" src={fit(p.image, 240)} alt="" loading="lazy" />}
            <div className="cell-actions">
              <Link to={`/post/${p.id}`} className="btn-outline btn-sm">View</Link>
              <button className="btn-outline btn-sm btn-danger" onClick={() => remove(p)}><Trash size={16} aria-hidden="true" /> Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {list.loading && <p className="adm-empty" role="status">Loading...</p>}
      {!list.loading && !list.items.length && !list.error && <p className="adm-empty">No posts match.</p>}
      {list.hasMore && !list.loading && <button className="btn-outline adm-more-btn" onClick={list.more}>Show more</button>}
    </div>
  )
}
