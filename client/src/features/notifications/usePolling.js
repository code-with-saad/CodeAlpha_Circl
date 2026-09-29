import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchUnread } from './notificationsSlice'

const INTERVAL_MS = 10_000

// Polls the unread count while the tab is visible. Hidden tabs stop polling and refresh the moment they return.
export function useNotificationPolling() {
  const dispatch = useDispatch()
  useEffect(() => {
    let timer = null
    const tick = () => dispatch(fetchUnread())
    const start = () => { if (!timer) { tick(); timer = setInterval(tick, INTERVAL_MS) } }
    const stop = () => { clearInterval(timer); timer = null }
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop())

    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [dispatch])
}
