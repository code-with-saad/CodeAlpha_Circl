import { useEffect, useState } from 'react'
import { api, errorMessage } from './api'

const fetchPage = (url, cursor) => api.get(url, { params: { cursor } }).then((r) => r.data)

// Cursor-paginated list for views that are not part of the Redux feed (e.g. a profile).
// Callers remount it per `url` (via a key), so it always starts in the loading state.
export function usePagedPosts(url) {
  const [state, setState] = useState({ items: [], cursor: null, hasMore: true, loading: true, error: '' })

  useEffect(() => {
    let live = true
    fetchPage(url)
      .then((d) => live && setState({ items: d.posts, cursor: d.nextCursor, hasMore: !!d.nextCursor, loading: false, error: '' }))
      .catch((e) => live && setState((s) => ({ ...s, loading: false, error: errorMessage(e) })))
    return () => { live = false }
  }, [url])

  function loadMore() {
    if (state.loading || !state.hasMore) return
    setState((s) => ({ ...s, loading: true }))
    fetchPage(url, state.cursor)
      .then((d) => setState((s) => ({ items: [...s.items, ...d.posts], cursor: d.nextCursor, hasMore: !!d.nextCursor, loading: false, error: '' })))
      .catch((e) => setState((s) => ({ ...s, loading: false, error: errorMessage(e) })))
  }

  const remove = (id) => setState((s) => ({ ...s, items: s.items.filter((p) => p.id !== id) }))
  return { ...state, loadMore, remove }
}
