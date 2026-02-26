/**
 * docSlice.ts — Redux Toolkit slice for document state.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export interface DocMeta {
  _id: string;
  title: string;
  version: number;
  createdBy: string;
  updatedAt: string;
}

interface DocState {
  list: DocMeta[];
  current: DocMeta | null;
  loading: boolean;
  error: string | null;
}

const initialState: DocState = {
  list: [],
  current: null,
  loading: false,
  error: null,
};

// ── Thunks ────────────────────────────────────────────────────────────────

export const fetchDocs = createAsyncThunk('docs/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API}/docs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // API returns { documents: [...] }
    return data.documents || [];
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.error ?? 'Failed to fetch documents');
  }
});

export const createDoc = createAsyncThunk(
  'docs/create',
  async (title: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API}/docs`,
        { title },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // API returns { document: {...} }
      return data.document;
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Failed to create document');
    }
  },
);

export const deleteDoc = createAsyncThunk(
  'docs/delete',
  async (docId: string, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/docs/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return docId;
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Failed to delete document');
    }
  },
);

export const updateDocTitle = createAsyncThunk(
  'docs/updateTitle',
  async ({ docId, title }: { docId: string; title: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(
        `${API}/docs/${docId}`,
        { title },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // API returns { document: {...} }
      return data.document;
    } catch (e: any) {
      return rejectWithValue(e.response?.data?.error ?? 'Failed to update title');
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────

const docSlice = createSlice({
  name: 'docs',
  initialState,
  reducers: {
    setCurrentDoc(state, action: PayloadAction<DocMeta | null>) {
      state.current = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchDocs
    builder.addCase(fetchDocs.pending, (s) => { s.loading = true; s.error = null; });
    builder.addCase(fetchDocs.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; });
    builder.addCase(fetchDocs.rejected, (s, a) => { s.loading = false; s.error = a.payload as string; });

    // createDoc
    builder.addCase(createDoc.fulfilled, (s, a) => { s.list.unshift(a.payload); });

    // deleteDoc
    builder.addCase(deleteDoc.fulfilled, (s, a) => {
      s.list = s.list.filter((d) => d._id !== a.payload);
      if (s.current?._id === a.payload) s.current = null;
    });

    // updateDocTitle
    builder.addCase(updateDocTitle.fulfilled, (s, a) => {
      const idx = s.list.findIndex((d) => d._id === a.payload._id);
      if (idx !== -1) s.list[idx] = a.payload;
      if (s.current?._id === a.payload._id) s.current = a.payload;
    });
  },
});

export const { setCurrentDoc, clearError } = docSlice.actions;
export default docSlice.reducer;