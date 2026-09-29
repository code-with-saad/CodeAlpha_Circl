import { configureStore } from '@reduxjs/toolkit'
import auth, { logout } from '../features/auth/authSlice'
import notifications from '../features/notifications/notificationsSlice'
import feed from '../features/feed/feedSlice'
import { onUnauthorized } from '../lib/api'

export const store = configureStore({ reducer: { auth, feed, notifications } })

// Any expired or invalid session anywhere in the app drops back to login.
onUnauthorized(() => store.dispatch(logout()))
