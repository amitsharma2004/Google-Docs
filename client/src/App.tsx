/**
 * App.tsx — Root component with routing and auth guard.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import LoginPage     from './pages/LoginPage';
import DocsListPage  from './pages/DocsListPage';
import DocEditorPage from './pages/DocEditorPage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useSelector((s: RootState) => s.auth.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const token = useSelector((s: RootState) => s.auth.token);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={token ? <Navigate to="/" replace /> : <LoginPage />} 
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DocsListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/docs/:docId"
          element={
            <PrivateRoute>
              <DocEditorPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;