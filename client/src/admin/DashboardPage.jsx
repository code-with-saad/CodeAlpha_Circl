import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, DownloadSimple, Minus } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import { api, errorMessage } from '../lib/api'
import { ago, timeAgo } from '../lib/time'
import { toast } from '../lib/feedback'
import { AreaChart, BarList, Sparkline, StackedBar } from './charts'
import { fmt, fmtDay } from './format'
import { downloadRows } from './shared'

const RANGES = [7, 30, 90]
const SERIES = [
  { key: 'signups', label: 'New people', color: 'var(--c-signups)' },
  { key: 'posts', label: 'Posts', color: 'var(--c-posts)' },
  { key: 'comments', label: 'Comments', color: 'var(--c-comments)' },
  { key: 'reshares', label: 'Reshares', color: 'var(--c-reshares)' },
]

function Delta({ change, range }) {
  if (change === null) return <span className="delta delta-new">New</span>
  if (change === 0) return <span className="delta"><Minus size={12} weight="bold" aria-hidden="true" /> 0%<span className="sr-only"> no change vs previous {range} days</span></span>
  const up = change > 0
  return (
    <span className={`delta ${up ? 'delta-up' : 'delta-down'}`}>
      {up ? <ArrowUpRight size={12} weight="bold" aria-hidden="true" /> : <ArrowDownRight size={12} weight="bold" aria-hidden="true" />}
      {Math.abs(change)}%<span className="sr-only"> {up ? 'up' : 'down'} vs previous {range} days</span>
    </span>
  )
}

function Kpi({ label, value, sub, delta, range, spark, color, to, tone }) {
  const body = (
    <>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{fmt(value)}</span>
      <span className="kpi-foot">
        {delta && <Delta change={delta.change} range={range} />}
        <span className="kpi-sub">{sub}</span>
      </span>
      {spark && <Sparkline values={spark} color={color} />}
    </>
  )
  return to
    ? <Link to={to} className={`kpi kpi-link${tone ? ` kpi-${tone}` : ''}`}>{body}</Link>
    : <div className="kpi">{body}</div>
}

export default function DashboardPage() {
  const [range, setRange] = useState(30)
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [shown, setShown] = useState({ signups: true, posts: true, comments: true, reshares: false })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    api.get('/admin/analytics', { params: { range } })
      .then((r) => live && setState({ status: 'ok', data: r.data, error: '' }))
      .catch((e) => live && setState((s) => ({ status: s.data ? 'ok' : 'error', data: s.data, error: errorMessage(e) })))
    return () => { live = false }
  }, [range, attempt])

  const d = state.data
  const series = useMemo(() => (d ? SERIES.filter((s) => shown[s.key]).map((s) => ({ ...s, values: d.series[s.key] })) : []), [d, shown])

  function downloadReport() {
    const rows = d.series.labels.map((day, i) => [day, d.series.signups[i], d.series.posts[i], d.series.reshares[i], d.series.comments[i]])
    downloadRows(`circl-activity-${range}d-${new Date().toISOString().slice(0, 10)}.csv`, ['date', 'new people', 'posts', 'reshares', 'comments'], rows)
    toast.success('Activity report downloaded')
  }

  if (state.status === 'error') {
    return (
      <div className="adm-page">
        <h1 className="adm-title">Dashboard</h1>
        <p className="adm-empty" role="alert">{state.error} <button className="link-btn" onClick={() => { setState({ status: 'loading', data: null, error: '' }); setAttempt((a) => a + 1) }}>Try again</button></p>
      </div>
    )
  }

  const loading = !d
  return (
    <div className="adm-page" aria-busy={loading}>
      <header className="adm-head">
        <div>
          <h1 className="adm-title">Dashboard</h1>
          <p className="adm-sub">{loading ? 'Loading numbers...' : `Last ${range} days, compared with the ${range} before`}</p>
        </div>
        <div className="adm-tools">
          <div className="seg" role="radiogroup" aria-label="Time range">
            {RANGES.map((r) => <button key={r} role="radio" aria-checked={range === r} onClick={() => setRange(r)}>{r} days</button>)}
          </div>
          <button className="btn-outline" onClick={downloadReport} disabled={loading}><DownloadSimple size={18} aria-hidden="true" /> Download report</button>
        </div>
      </header>

      {loading ? <div className="adm-skel" role="status" aria-label="Loading dashboard" /> : (
        <>
          <section className="kpis" aria-label="Key numbers">
            <Kpi label="People" value={d.totals.users} sub={`+${fmt(d.period.signups.value)} in ${range} days`} delta={d.period.signups} range={range} spark={d.series.signups} color="var(--c-signups)" />
            <Kpi label="Posts" value={d.period.posts.value} sub={`${fmt(d.totals.posts)} all time`} delta={d.period.posts} range={range} spark={d.series.posts} color="var(--c-posts)" />
            <Kpi label="Comments" value={d.period.comments.value} sub={`${fmt(d.totals.comments)} all time`} delta={d.period.comments} range={range} spark={d.series.comments} color="var(--c-comments)" />
            <Kpi label="Reshares" value={d.period.reshares.value} sub={`${fmt(d.totals.reshares)} all time`} delta={d.period.reshares} range={range} spark={d.series.reshares} color="var(--c-reshares)" />
            <Kpi label="Active today" value={d.active.day} sub={`${fmt(d.active.week)} this week`} />
            <Kpi label="Open reports" value={d.totals.openReports} sub={d.totals.openReports ? 'Needs review' : 'All clear'} to="/admin/reports" tone={d.totals.openReports ? 'warn' : 'ok'} />
          </section>

          <div className="adm-cols">
            <section className="card" aria-labelledby="c-activity">
              <div className="card-head">
                <h2 id="c-activity">Activity</h2>
                <div className="toggles" role="group" aria-label="Series shown">
                  {SERIES.map((s) => (
                    <button key={s.key} aria-pressed={shown[s.key]} onClick={() => setShown((p) => ({ ...p, [s.key]: !p[s.key] }))}>
                      <i style={{ background: s.color }} aria-hidden="true" />{s.label}
                    </button>
                  ))}
                </div>
              </div>
              {series.length ? (
                <AreaChart
                  labels={d.series.labels}
                  series={series}
                  summary={`Daily activity from ${fmtDay(d.series.labels[0])} to ${fmtDay(d.series.labels.at(-1))}. ${series.map((s) => `${s.label}: ${fmt(s.values.reduce((a, b) => a + b, 0))} total`).join('. ')}. Use the left and right arrow keys to read each day.`}
                />
              ) : <p className="adm-empty">Turn on at least one series to see the chart.</p>}
            </section>

            <section className="card" aria-labelledby="c-mix">
              <div className="card-head"><h2 id="c-mix">What people post</h2></div>
              <StackedBar
                label={`Post types in the last ${range} days`}
                parts={[
                  { key: 'text', label: 'Text posts', value: d.mix.text, color: 'var(--c-comments)' },
                  { key: 'photo', label: 'With a photo', value: d.mix.photo, color: 'var(--c-posts)' },
                  { key: 'reshare', label: 'Reshares', value: d.mix.reshare, color: 'var(--c-reshares)' },
                  { key: 'quote', label: 'Quotes', value: d.mix.quote, color: 'var(--c-signups)' },
                ]}
              />
              <dl className="health">
                <div><dt>Total likes</dt><dd>{fmt(d.totals.likes)}</dd></div>
                <div><dt>Likes per post</dt><dd>{d.totals.posts ? (d.totals.likes / d.totals.posts).toFixed(1) : '0'}</dd></div>
                <div><dt>Comments per post</dt><dd>{d.totals.posts ? (d.totals.comments / d.totals.posts).toFixed(1) : '0'}</dd></div>
                <div><dt>Suspended accounts</dt><dd>{fmt(d.totals.banned)}</dd></div>
              </dl>
            </section>
          </div>

          <div className="adm-cols adm-cols-3">
            <section className="card" aria-labelledby="c-top">
              <div className="card-head"><h2 id="c-top">Top posts</h2><span className="muted-sm">by engagement</span></div>
              {d.topPosts.length ? (
                <ol className="ranked">
                  {d.topPosts.map((p) => (
                    <li key={p.id}>
                      <Avatar user={p.author} size={32} />
                      <Link to={`/post/${p.id}`} className="ranked-main">
                        <span className="ranked-text">{p.text || '(photo)'}</span>
                        <span className="muted-sm">@{p.author?.username} · {p.likes} likes · {p.comments} comments · {p.reshares} reshares</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : <p className="adm-empty">No engagement in this period yet.</p>}
            </section>

            <section className="card" aria-labelledby="c-creators">
              <div className="card-head"><h2 id="c-creators">Top creators</h2><span className="muted-sm">by posts</span></div>
              {d.topAuthors.length ? (
                <ol className="ranked">
                  {d.topAuthors.map((a) => (
                    <li key={a.author.id}>
                      <Avatar user={a.author} size={32} />
                      <Link to={`/u/${a.author.username}`} className="ranked-main">
                        <span className="ranked-text">{a.author.displayName}</span>
                        <span className="muted-sm">{a.posts} posts · {a.likes} likes</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : <p className="adm-empty">No posts in this period.</p>}
            </section>

            <section className="card" aria-labelledby="c-tags">
              <div className="card-head"><h2 id="c-tags">Popular hashtags</h2></div>
              <BarList items={d.tags.map((t) => ({ label: `#${t.tag}`, value: t.posts }))} color="var(--c-posts)" empty="No hashtags used in this period." />
            </section>
          </div>

          <div className="adm-cols adm-cols-eq">
            <section className="card" aria-labelledby="c-new">
              <div className="card-head"><h2 id="c-new">Newest people</h2><Link to="/admin/people" className="card-link">See everyone</Link></div>
              <ul className="ranked">
                {d.recentSignups.map((u) => (
                  <li key={u.id}>
                    <Avatar user={u} size={32} />
                    <Link to={`/u/${u.username}`} className="ranked-main">
                      <span className="ranked-text">{u.displayName}</span>
                      <span className="muted-sm">@{u.username} · joined {ago(u.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card" aria-labelledby="c-log">
              <div className="card-head"><h2 id="c-log">Admin activity</h2></div>
              {d.activity.length ? (
                <ul className="log">
                  {d.activity.map((a) => (
                    <li key={a.id}>
                      <span><strong>{a.admin}</strong> {a.action.toLowerCase()} <span className="log-target">{a.target}</span></span>
                      <time className="muted-sm" dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              ) : <p className="adm-empty">No moderation actions yet.</p>}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
