import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react'
import { dismissToast, settleConfirm, useConfirm, useToasts } from '../lib/feedback'
import './feedback.css'

const ICONS = { success: CheckCircle, error: WarningCircle, info: Info }

function ToastItem({ toast }) {
  const [paused, setPaused] = useState(false)
  const Icon = ICONS[toast.kind]

  // Errors stay longer so they can be read; hovering or focusing pauses the timer.
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => dismissToast(toast.id), toast.kind === 'error' ? 7000 : 4000)
    return () => clearTimeout(t)
  }, [paused, toast.id, toast.kind])

  return (
    <div
      className={`toast toast-${toast.kind}`}
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="toast-icon" size={22} weight="fill" aria-hidden="true" />
      <span className="toast-text">{toast.message}</span>
      <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss message">
        <X size={18} />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="toaster" role="region" aria-label="Messages">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}

function Dialog({ request }) {
  const ref = useRef(null)

  // A native <dialog> gives us focus trapping, Escape handling and an inert page behind it.
  useEffect(() => {
    const el = ref.current
    if (el && !el.open) el.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby="confirm-title"
      aria-describedby={request.message ? 'confirm-message' : undefined}
      onCancel={(e) => { e.preventDefault(); settleConfirm(false) }}
      onClick={(e) => { if (e.target === ref.current) settleConfirm(false) }}
    >
      <h2 id="confirm-title" className="confirm-title">{request.title}</h2>
      {request.message && <p id="confirm-message" className="confirm-message">{request.message}</p>}
      <div className="confirm-actions">
        {/* Focus starts on Cancel so a stray Enter never confirms a destructive action */}
        <button className="btn-outline" onClick={() => settleConfirm(false)} autoFocus>Cancel</button>
        <button className={request.danger ? 'btn-danger-solid' : 'btn-primary confirm-go'} onClick={() => settleConfirm(true)}>
          {request.confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

export function ConfirmHost() {
  const request = useConfirm()
  return request ? <Dialog key={request.title + request.message} request={request} /> : null
}
