import { thumb } from '../lib/cloudinary'

// Fallback tone is derived from the username so a person keeps the same colour everywhere.
function tone(name = '') {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 32% 34%)`
}

export default function Avatar({ user, size = 40 }) {
  const label = user?.displayName || user?.username || '?'
  const style = { width: size, height: size, fontSize: size * 0.44 }
  if (user?.avatar) {
    return <img className="avatar" style={style} src={thumb(user.avatar, size)} alt="" width={size} height={size} loading="lazy" />
  }
  return (
    <span className="avatar avatar-fallback" style={{ ...style, background: tone(user?.username) }} aria-hidden="true">
      {label[0].toUpperCase()}
    </span>
  )
}
