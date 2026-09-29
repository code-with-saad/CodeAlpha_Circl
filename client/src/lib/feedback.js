import { useSyncExternalStore } from 'react'

// A small external store so toasts and confirmations can be triggered from anywhere
// (components, thunks, the API layer) without prop drilling or a provider.

const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

/* ---------------- toasts ---------------- */
let toasts = []
let nextId = 1

function push(kind, message) {
  // The same message twice in a row would just stack; keep the newer one.
  toasts = toasts.filter((t) => !(t.kind === kind && t.message === message))
  toasts = [...toasts, { id: nextId++, kind, message }].slice(-3)
  emit()
}

export const toast = {
  success: (message) => push('success', message),
  error: (message) => push('error', message),
  info: (message) => push('info', message),
}

export const dismissToast = (id) => {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const useToasts = () => useSyncExternalStore(subscribe, () => toasts)

/* ---------------- confirmations ---------------- */
let pending = null

// Replaces window.confirm. Resolves true when confirmed, false on cancel, Escape or backdrop click.
export function confirm({ title, message = '', confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    // A second request while one is open cancels the first.
    pending?.resolve(false)
    pending = { title, message, confirmLabel, danger, resolve }
    emit()
  })
}

export function settleConfirm(result) {
  const current = pending
  pending = null
  emit()
  current?.resolve(result)
}

export const useConfirm = () => useSyncExternalStore(subscribe, () => pending)
