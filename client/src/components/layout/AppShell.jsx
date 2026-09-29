import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Avatar from '../Avatar'
import { logout } from '../../features/auth/authSlice'
import '../discover.css'
import { useNotificationPolling } from '../../features/notifications/usePolling'
import { SuggestedList, TrendingList } from '../Discover'
import { House, Compass, Bell, User, Bookmark, GearSix, PencilSimple, ShieldCheck, SignOut } from '@phosphor-icons/react'

const items = [
  { to: '/', label: 'Home', Icon: House, end: true },
  { to: '/explore', label: 'Explore', Icon: Compass },
  { to: '/notifications', label: 'Alerts', Icon: Bell },
  { to: '/me', label: 'Profile', Icon: User },
  { to: '/saved', label: 'Saved', Icon: Bookmark, desktopOnly: true },
  { to: '/settings', label: 'Settings', Icon: GearSix, desktopOnly: true },
]

function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label="Circl home">
      <span className="wordmark-ring" aria-hidden="true" />
      <span className="wordmark-text">Circl</span>
    </Link>
  )
}

function NavItem({ to, label, Icon, end, desktopOnly, badge = 0 }) {
  return (
    <NavLink to={to} end={end} className={`nav-link${desktopOnly ? ' nav-link-desk' : ''}`}>
      {({ isActive }) => (
        <>
          <span className="nav-icon-wrap">
            <Icon className="nav-icon" size={26} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
            {badge > 0 && <span className="nav-badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</span>}
          </span>
          <span className="nav-label">{label}</span>
          <span className="sr-only">{label}{badge > 0 ? `, ${badge} unread` : ''}</span>
        </>
      )}
    </NavLink>
  )
}

// The bottom tab bar only fits five destinations, so the rest live behind the avatar on small screens.
function MobileMenu() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
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

  const close = () => setOpen(false)
  return (
    <div className="mobile-menu" ref={wrap}>
      <button ref={trigger} className="menu-trigger" aria-haspopup="menu" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen((o) => !o)}>
        <Avatar user={user} size={32} />
      </button>
      {open && (
        <div className="sheet" role="menu" aria-label="Account menu">
          <div className="sheet-head">
            <strong>{user.displayName}</strong>
            <span className="suggest-sub">@{user.username}</span>
          </div>
          <Link role="menuitem" to="/saved" onClick={close}><Bookmark size={22} aria-hidden="true" /> Saved</Link>
          <Link role="menuitem" to="/settings" onClick={close}><GearSix size={22} aria-hidden="true" /> Settings</Link>
          {user.role === 'admin' && <Link role="menuitem" to="/admin" onClick={close}><ShieldCheck size={22} aria-hidden="true" /> Admin</Link>}
          <button role="menuitem" onClick={() => { close(); dispatch(logout()) }}><SignOut size={22} aria-hidden="true" /> Log out</button>
        </div>
      )}
    </div>
  )
}

export default function AppShell() {
  const { username, role } = useSelector((s) => s.auth.user)
  const unread = useSelector((s) => s.notifications.unread)
  useNotificationPolling()
  const nav = [...items, ...(role === 'admin' ? [{ to: '/admin', label: 'Admin', Icon: ShieldCheck, desktopOnly: true }] : [])].map((i) => (i.to === '/me' ? { ...i, to: `/u/${username}` } : i))
  return (
    <div className="shell">
      <nav className="nav" aria-label="Primary">
        <div className="nav-brand"><Wordmark /></div>
        {nav.slice(0, 2).map((i) => <NavItem key={i.to} {...i} badge={i.to === '/notifications' ? unread : 0} />)}
        <Link to="/compose" className="nav-link nav-compose" aria-label="New post">
          <PencilSimple size={26} weight="bold" aria-hidden="true" />
          <span className="nav-compose-label">Post</span>
        </Link>
        {nav.slice(2).map((i) => <NavItem key={i.to} {...i} badge={i.to === '/notifications' ? unread : 0} />)}
      </nav>
      <div className="main">
        <header className="topbar"><Wordmark /><MobileMenu /></header>
        <main className="feed-col"><Outlet /></main>
        <aside className="rail-right" aria-label="Suggestions and trending">
          <div className="rail-section"><SuggestedList /></div>
          <div className="rail-section"><TrendingList /></div>
        </aside>
      </div>
    </div>
  )
}
