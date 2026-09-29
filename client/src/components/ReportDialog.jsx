import { useEffect, useRef, useState } from 'react'
import { api, errorMessage } from '../lib/api'
import { toast } from '../lib/feedback'
import './feedback.css'

const REASONS = [
  ['spam', 'Spam or scam'],
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate or abuse'],
  ['misinformation', 'False information'],
  ['inappropriate', 'Inappropriate content'],
  ['other', 'Something else'],
]

// Report a post or a person. `type` is "post" or "user"; `label` names it in the title.
export default function ReportDialog({ type, id, label, onClose }) {
  const ref = useRef(null)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { ref.current?.showModal() }, [])

  async function submit(e) {
    e.preventDefault()
    if (!reason || busy) return
    setBusy(true)
    try {
      await api.post('/reports', { type, id, reason, details })
      toast.success('Thanks. Our team will take a look.')
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
      // A duplicate report is not worth keeping the dialog open for.
      if (err.response?.status === 409) onClose()
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={ref}
      className="confirm report"
      aria-labelledby="report-title"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
    >
      <form onSubmit={submit}>
        <h2 id="report-title" className="confirm-title">Report {label}</h2>
        <fieldset className="report-reasons">
          <legend className="confirm-message">What is wrong?</legend>
          {REASONS.map(([key, text]) => (
            <label key={key} className="report-reason">
              <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} />
              <span>{text}</span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span className="field-label">More detail (optional)</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} rows={2} />
        </label>
        <div className="confirm-actions" style={{ marginTop: 'var(--s4)' }}>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary confirm-go" disabled={!reason || busy}>{busy ? 'Sending...' : 'Send report'}</button>
        </div>
      </form>
    </dialog>
  )
}
