import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '../../lib/api'
import { logout } from '../auth/authSlice'

// Failures are ignored on purpose: a missed poll should never show an error, the next one retries.
export const fetchUnread = createAsyncThunk('notifications/unread', async () => (await api.get('/notifications/unread-count')).data.count)

const slice = createSlice({
  name: 'notifications',
  initialState: { unread: 0 },
  reducers: {
    unreadCleared(state) { state.unread = 0 },
  },
  extraReducers: (b) => {
    b.addCase(fetchUnread.fulfilled, (s, { payload }) => { s.unread = payload })
    b.addCase(logout, () => ({ unread: 0 }))
  },
})

export const { unreadCleared } = slice.actions
export default slice.reducer
