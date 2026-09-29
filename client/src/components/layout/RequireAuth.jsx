import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { fetchMe } from '../../features/auth/authSlice'

export default function RequireAuth() {
  const dispatch = useDispatch()
  const location = useLocation()
  const { token, user, booting } = useSelector((s) => s.auth)

  useEffect(() => {
    if (token && !user) dispatch(fetchMe())
  }, [token, user, dispatch])

  if (booting) return <div className="boot" role="status" aria-label="Loading"><span className="wordmark-ring" /></div>
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
