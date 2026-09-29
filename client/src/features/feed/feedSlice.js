import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, errorMessage } from '../../lib/api'
import { logout } from '../auth/authSlice'

const emptyTab = () => ({ items: [], cursor: null, hasMore: true, status: 'idle', error: null })

// `reset` reloads from the top (tab switch, pull to refresh); otherwise it appends the next page.
export const fetchFeed = createAsyncThunk('feed/fetch', async ({ tab, reset }, { getState, rejectWithValue }) => {
  const cursor = reset ? undefined : getState().feed[tab].cursor
  try {
    const { data } = await api.get('/posts', { params: { feed: tab, cursor } })
    return { tab, reset, ...data }
  } catch (e) {
    return rejectWithValue({ tab, message: errorMessage(e) })
  }
})

const slice = createSlice({
  name: 'feed',
  initialState: { everyone: emptyTab(), following: emptyTab() },
  reducers: {
    postCreated(state, { payload }) {
      // Your own post always belongs in both tabs.
      for (const tab of ['everyone', 'following']) state[tab].items.unshift(payload)
    },
    postRemoved(state, { payload: id }) {
      for (const tab of ['everyone', 'following']) state[tab].items = state[tab].items.filter((p) => p.id !== id)
    },
    // Something changed server-side (e.g. a reshare); refetch each tab next time it is shown.
    feedStale(state) {
      for (const tab of ['everyone', 'following']) if (state[tab].status === 'ready') state[tab].status = 'idle'
    },
    postPatched(state, { payload }) {
      for (const tab of ['everyone', 'following']) {
        const p = state[tab].items.find((x) => x.id === payload.id)
        if (p) Object.assign(p, payload)
      }
    },
  },
  extraReducers: (b) => {
    // A previous user's feed must never survive into the next session.
    b.addCase(logout, () => ({ everyone: emptyTab(), following: emptyTab() }))
    b.addCase(fetchFeed.pending, (s, { meta }) => {
      s[meta.arg.tab].status = 'loading'
      s[meta.arg.tab].error = null
    })
    b.addCase(fetchFeed.fulfilled, (s, { payload }) => {
      const t = s[payload.tab]
      const seen = new Set(payload.reset ? [] : t.items.map((p) => p.id))
      const fresh = payload.posts.filter((p) => !seen.has(p.id))
      t.items = payload.reset ? payload.posts : [...t.items, ...fresh]
      t.cursor = payload.nextCursor
      t.hasMore = !!payload.nextCursor
      t.status = 'ready'
    })
    b.addCase(fetchFeed.rejected, (s, { payload, meta }) => {
      const t = s[meta.arg.tab]
      t.status = 'error'
      t.error = payload?.message || 'Could not load the feed'
    })
  },
})

export const { postCreated, postRemoved, postPatched, feedStale } = slice.actions
export default slice.reducer
