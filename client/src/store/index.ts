/**
 * store/index.ts — Redux store configuration.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import docReducer  from './docSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    docs: docReducer,
  },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;