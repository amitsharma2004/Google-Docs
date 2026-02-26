/**
 * authSlice.ts — Redux Toolkit slice for auth state.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') ?? 'null'),
  loading: false,
  error: null,
};

// ── Thunks ────────────────────────────────────────────────────────────────

export const register = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API}/auth/register`, payload);
      return data as { token: string; user: UserInfo };
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Registration failed');
    }
  },
);

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API}/auth/login`, payload);
      return data as { token: string; user: UserInfo };
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Login failed');
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user  = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const handleAuthFulfilled = (
      state: AuthState,
      action: PayloadAction<{ token: string; user: UserInfo }>,
    ) => {
      state.loading = false;
      state.token   = action.payload.token;
      state.user    = action.payload.user;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    };

    builder
      .addCase(register.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(register.fulfilled, handleAuthFulfilled)
      .addCase(register.rejected,  (s, a) => { s.loading = false; s.error = a.payload as string; })

      .addCase(login.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(login.fulfilled, handleAuthFulfilled)
      .addCase(login.rejected,  (s, a) => { s.loading = false; s.error = a.payload as string; });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;