import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, tokenStore, errorMessage, fieldErrors } from '../../lib/api'

const rejectWith = (err, rejectWithValue) =>
  rejectWithValue({ message: errorMessage(err), fields: fieldErrors(err) })

export const register = createAsyncThunk('auth/register', async (body, { rejectWithValue }) => {
  try { return (await api.post('/auth/register', body)).data } catch (e) { return rejectWith(e, rejectWithValue) }
})

export const login = createAsyncThunk('auth/login', async (body, { rejectWithValue }) => {
  try { return (await api.post('/auth/login', body)).data } catch (e) { return rejectWith(e, rejectWithValue) }
})

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try { return (await api.get('/auth/me')).data } catch (e) { return rejectWith(e, rejectWithValue) }
})

const hasToken = !!tokenStore.get()

const slice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: tokenStore.get(),
    // true while a stored token is being verified on first load
    booting: hasToken,
    submitting: false,
    error: null,
    fields: {},
  },
  reducers: {
    logout(state) {
      tokenStore.clear()
      state.user = null
      state.token = null
      state.booting = false
    },
    userUpdated(state, { payload }) {
      state.user = payload
    },
    tokenRefreshed(state, { payload }) {
      tokenStore.set(payload)
      state.token = payload
    },
    followingChanged(state, { payload }) {
      if (state.user) state.user.followingCount = Math.max(0, state.user.followingCount + payload)
    },
    clearError(state) {
      state.error = null
      state.fields = {}
    },
  },
  extraReducers: (b) => {
    for (const thunk of [register, login]) {
      b.addCase(thunk.pending, (s) => { s.submitting = true; s.error = null; s.fields = {} })
      b.addCase(thunk.fulfilled, (s, { payload }) => {
        tokenStore.set(payload.token)
        s.submitting = false
        s.token = payload.token
        s.user = payload.user
      })
      b.addCase(thunk.rejected, (s, { payload }) => {
        s.submitting = false
        s.error = payload?.message || 'Something went wrong. Try again.'
        s.fields = payload?.fields || {}
      })
    }
    b.addCase(fetchMe.fulfilled, (s, { payload }) => { s.user = payload.user; s.booting = false })
    b.addCase(fetchMe.rejected, (s) => {
      tokenStore.clear()
      s.user = null
      s.token = null
      s.booting = false
    })
  },
})

export const { logout, clearError, userUpdated, followingChanged, tokenRefreshed } = slice.actions
export default slice.reducer
