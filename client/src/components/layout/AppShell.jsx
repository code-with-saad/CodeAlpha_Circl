import { useSelector } from 'react-redux'
import { Link, NavLink, Outlet } from 'react-router-dom'
import '../discover.css'
import { useNotificationPolling } from '../../features/notifications/usePolling'
import { SuggestedList, TrendingList } from '../Discover'
import { House, Compass, Bell, User, Bookmark, GearSix, PencilSimple, ShieldCheck } from '@phosphor-icons/react'

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
        <header className="topbar"><Wordmark /></header>
        <main className="feed-col"><Outlet /></main>
        <aside className="rail-right" aria-label="Suggestions and trending">
          <div className="rail-section"><SuggestedList /></div>
          <div className="rail-section"><TrendingList /></div>
        </aside>
      </div>
    </div>
  )
}
