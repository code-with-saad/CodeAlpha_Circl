import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { Article, Flag, GearSix, House, SignOut, SquaresFour, UsersThree, DotsThreeOutline } from '@phosphor-icons/react'
import Avatar from '../components/Avatar'
import { api } from '../lib/api'
import { logout } from '../features/auth/authSlice'
import { REPORTS_CHANGED } from './shared'
import './admin.css'

const NAV = [
  { to: '/admin', label: 'Dashboard', Icon: SquaresFour, end: true },
  { to: '/admin/people', label: 'People', Icon: UsersThree },
  { to: '/admin/content', label: 'Content', Icon: Article },
  { to: '/admin/reports', label: 'Reports', Icon: Flag, badge: true },
]

// Open-report count for the badge: refreshed on a timer while visible and whenever a report is handled.
function useOpenReports() {
  const [open, setOpen] = useState(0)
  useEffect(() => {
    let live = true
    const load = () => api.get('/admin/reports/count').then((r) => live && setOpen(r.data.open)).catch(() => {})
    load()
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 30_000)
    window.addEventListener(REPORTS_CHANGED, load)
    return () => { live = false; clearInterval(timer); window.removeEventListener(REPORTS_CHANGED, load) }
  }, [])
  return open
}

function Item({ to, label, Icon, end, count = 0 }) {
  return (
    <NavLink to={to} end={end} className="adm-link">
      <span className="adm-icon">
        <Icon size={24} weight="regular" aria-hidden="true" />
        {count > 0 && <span className="adm-badge" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
      </span>
      <span className="adm-link-label">{label}</span>
      {count > 0 && <span className="sr-only">, {count} open</span>}
    </NavLink>
  )
}

function MoreMenu() {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="adm-more" ref={wrap}>
      <button ref={trigger} className="adm-link" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="adm-icon"><DotsThreeOutline size={24} aria-hidden="true" /></span>
        <span className="adm-link-label">More</span>
      </button>
      {open && (
        <div className="adm-sheet" role="menu" aria-label="More admin options">
          <Link role="menuitem" to="/" onClick={() => setOpen(false)}><House size={22} aria-hidden="true" /> Back to Circl</Link>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)}><GearSix size={22} aria-hidden="true" /> Account settings</Link>
          <button role="menuitem" onClick={() => { setOpen(false); dispatch(logout()) }}><SignOut size={22} aria-hidden="true" /> Log out</button>
        </div>
      )}
    </div>
  )
}

// A separate layout from the social app: dark sidebar on wide screens, icon rail on tablets, tab bar on phones.
export default function AdminShell() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const openReports = useOpenReports()
  if (user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link to="/admin" className="adm-brand" aria-label="Circl admin dashboard">
          <span className="wordmark-ring" aria-hidden="true" />
          <span className="adm-brand-text">Circl <em>Admin</em></span>
        </Link>
        <nav className="adm-nav" aria-label="Admin">
          {NAV.map((n) => <Item key={n.to} {...n} count={n.badge ? openReports : 0} />)}
          <div className="adm-more-slot"><MoreMenu /></div>
        </nav>
        <div className="adm-foot">
          <Link to="/" className="adm-link adm-desk-only"><span className="adm-icon"><House size={24} aria-hidden="true" /></span><span className="adm-link-label">Back to Circl</span></Link>
          <button className="adm-link adm-desk-only" onClick={() => dispatch(logout())}><span className="adm-icon"><SignOut size={24} aria-hidden="true" /></span><span className="adm-link-label">Log out</span></button>
          <div className="adm-user">
            <Avatar user={user} size={34} />
            <span className="adm-user-text"><strong>{user.displayName}</strong><span>Administrator</span></span>
          </div>
        </div>
      </aside>

      <header className="adm-topbar">
        <Link to="/admin" className="adm-brand" aria-label="Circl admin dashboard">
          <span className="wordmark-ring" aria-hidden="true" />
          <span className="adm-brand-text">Circl <em>Admin</em></span>
        </Link>
      </header>

      <main className="adm-main"><Outlet /></main>
    </div>
  )
}
