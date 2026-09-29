import { Link } from 'react-router-dom'

// A hashtag starts at a word boundary, so "C#" and URL fragments are not tags. Mirrors the server rule.
const TAG_RE = /(?<![\p{L}\p{N}_&/])#([\p{L}\p{N}_]{1,30})/gu

// Renders text as plain React nodes (never HTML), turning #tags into links.
export default function PostText({ text, className = 'post-text' }) {
  const parts = []
  let last = 0
  for (const m of text.matchAll(TAG_RE)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(<Link key={m.index} to={`/tag/${m[1].toLowerCase()}`} className="hashtag">{m[0]}</Link>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <p className={className}>{parts}</p>
}
