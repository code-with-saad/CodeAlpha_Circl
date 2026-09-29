import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import { toast } from '../lib/feedback'

// The sidebar badge listens for this so it updates the moment a report is handled.
export const REPORTS_CHANGED = 'admin:reports-changed'
export const reportsChanged = () => window.dispatchEvent(new Event(REPORTS_CHANGED))

// Cursor-paginated admin list. Callers remount it (via key) or change `params` to start over.
export function useAdminList(path, params, pick) {
  const key = JSON.stringify(params)
  const [state, setState] = useState({ items: [], cursor: null, hasMore: false, loading: true, error: '' })

  const page = useCallback((cursor) => api.get(path, { params: { ...JSON.parse(key), cursor } }).then((r) => r.data), [path, key])

  useEffect(() => {
    let live = true
    page()
      .then((d) => live && setState({ items: pick(d), cursor: d.nextCursor, hasMore: !!d.nextCursor, loading: false, error: '' }))
      .catch((e) => live && setState({ items: [], cursor: null, hasMore: false, loading: false, error: errorMessage(e) }))
    return () => { live = false }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function more() {
    setState((s) => ({ ...s, loading: true }))
    page(state.cursor)
      .then((d) => setState((s) => ({ items: [...s.items, ...pick(d)], cursor: d.nextCursor, hasMore: !!d.nextCursor, loading: false, error: '' })))
      .catch((e) => setState((s) => ({ ...s, loading: false, error: errorMessage(e) })))
  }
  const patch = (fn) => setState((s) => ({ ...s, items: fn(s.items) }))
  return { ...state, more, patch }
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Exports need the auth header, so they are fetched and saved from memory rather than opened as a link.
export async function downloadExport(type) {
  try {
    const res = await api.get(`/admin/export/${type}`, { responseType: 'blob' })
    saveBlob(res.data, `circl-${type}-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success(`Exported ${type}`)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

export function downloadRows(name, header, rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const body = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
  saveBlob(new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' }), name)
}
