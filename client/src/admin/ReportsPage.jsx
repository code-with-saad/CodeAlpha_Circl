import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, DownloadSimple, Prohibit, Trash } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import { api, errorMessage } from '../lib/api'
import { confirm, toast } from '../lib/feedback'
import { ago } from '../lib/time'
import { downloadExport, reportsChanged, useAdminList } from './shared'

const TABS = [['open', 'Open'], ['actioned', 'Action taken'], ['dismissed', 'Dismissed']]
const REASONS = {
  spam: 'Spam or scam', harassment: 'Harassment', hate: 'Hate or abuse',
  misinformation: 'False information', inappropriate: 'Inappropriate', other: 'Other',
}

export default function ReportsPage() {
  const [status, setStatus] = useState('open')
  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1 className="adm-title">Reports</h1>
          <p className="adm-sub">What people have flagged for review</p>
        </div>
        <div className="adm-tools">
          <button className="btn-outline" onClick={() => downloadExport('reports')}><DownloadSimple size={18} aria-hidden="true" /> Export CSV</button>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Report status">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={status === key} onClick={() => setStatus(key)}>{label}</button>
        ))}
      </div>

      <Queue key={status} status={status} />
    </div>
  )
}

function Queue({ status }) {
  const list = useAdminList('/admin/reports', { status }, (d) => d.reports)
  const open = status === 'open'

  async function act(r, action) {
    const who = r.user?.username || r.post?.author.username
    const asks = {
      remove_post: { title: 'Remove this post?', message: 'The post, its comments and reshares are deleted, and every report about it is closed.', confirmLabel: 'Remove post' },
      suspend_user: { title: `Suspend @${who}?`, message: 'They are signed out and cannot log in until you restore them.', confirmLabel: 'Suspend' },
    }
    if (asks[action] && !(await confirm({ ...asks[action], danger: true }))) return
    try {
      await api.patch(`/admin/reports/${r.id}`, { action })
      list.patch((items) => items.filter((x) => x.id !== r.id))
      toast.success({ dismiss: 'Report dismissed', remove_post: 'Post removed', suspend_user: `@${who} suspended` }[action])
      reportsChanged()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <>
      {list.error && <p className="adm-empty" role="alert">{list.error}</p>}
      <ul className="reports">
        {list.items.map((r) => (
          <li key={r.id} className="report-card">
            <div className="report-top">
              <span className="pill pill-warn">{REASONS[r.reason]}</span>
              <span className="pill">{r.targetType === 'post' ? 'Post' : 'Person'}</span>
              {r.openOnTarget > 1 && <span className="pill pill-warn">{r.openOnTarget} open reports on this</span>}
              <span className="muted-sm report-when">
                Reported by {r.reporter ? `@${r.reporter.username}` : 'a removed account'} · {ago(r.createdAt)}
              </span>
            </div>

            {r.details && <p className="report-details">"{r.details}"</p>}

            <div className="report-target">
              {r.post ? (
                <>
                  <Avatar user={r.post.author} size={36} />
                  <div>
                    <span className="muted-sm">Post by <Link to={`/u/${r.post.author.username}`}>@{r.post.author.username}</Link></span>
                    <p className="report-text">{r.post.text || '(photo only)'}</p>
                    <Link to={`/post/${r.post.id}`} className="card-link">Open post</Link>
                  </div>
                </>
              ) : r.user ? (
                <>
                  <Avatar user={r.user} size={36} />
                  <div>
                    <strong>{r.user.displayName}</strong> <span className="muted-sm">@{r.user.username}</span>
                    {r.user.banned && <span className="pill pill-warn" style={{ marginLeft: 8 }}>Suspended</span>}
                    <div><Link to={`/u/${r.user.username}`} className="card-link">Open profile</Link></div>
                  </div>
                </>
              ) : <p className="muted-sm">The reported content is no longer available.</p>}
            </div>

            {open ? (
              <div className="report-actions">
                <button className="btn-outline btn-sm" onClick={() => act(r, 'dismiss')}><Check size={16} aria-hidden="true" /> Dismiss</button>
                {r.post && <button className="btn-outline btn-sm btn-danger" onClick={() => act(r, 'remove_post')}><Trash size={16} aria-hidden="true" /> Remove post</button>}
                {(r.post || (r.user && !r.user.banned)) && (
                  <button className="btn-outline btn-sm btn-danger" onClick={() => act(r, 'suspend_user')}><Prohibit size={16} aria-hidden="true" /> Suspend {r.post ? 'author' : 'person'}</button>
                )}
              </div>
            ) : (
              <p className="muted-sm">{r.resolution || 'Closed'}{r.resolvedAt ? ` · ${ago(r.resolvedAt)}` : ''}</p>
            )}
          </li>
        ))}
      </ul>

      {list.loading && <p className="adm-empty" role="status">Loading...</p>}
      {!list.loading && !list.items.length && !list.error && (
        <p className="adm-empty">{open ? 'Nothing waiting for review. All clear.' : 'Nothing here yet.'}</p>
      )}
      {list.hasMore && !list.loading && <button className="btn-outline adm-more-btn" onClick={list.more}>Show more</button>}
    </>
  )
}
