export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Readable in a sentence: "5m ago", "3d ago", "just now", or "on Sep 20" once it is more than a week old.
export function ago(iso) {
  const t = timeAgo(iso)
  if (t === 'now') return 'just now'
  return /^\d+[mhd]$/.test(t) ? `${t} ago` : `on ${t}`
}
