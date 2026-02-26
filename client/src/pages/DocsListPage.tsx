/**
 * DocsListPage.tsx — Dashboard listing all user documents.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDocs, createDoc, deleteDoc } from '../store/docSlice';
import { logout } from '../store/authSlice';
import ThemeToggle from '../components/ThemeToggle';
import type { AppDispatch, RootState } from '../store';

  const DocsListPage: React.FC = () => {
  const dispatch   = useDispatch<AppDispatch>();
  const navigate   = useNavigate(); 
  const { list, loading } = useSelector((s: RootState) => s.docs);
  const { user }          = useSelector((s: RootState) => s.auth);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => { dispatch(fetchDocs()); }, [dispatch]);

  const handleCreate = async () => {
    const title = newTitle.trim() || 'Untitled Document';
    const result = await dispatch(createDoc(title));
    if (createDoc.fulfilled.match(result)) {
      navigate(`/docs/${result.payload._id}`);
    }
    setNewTitle('');
  };

  return (
    <div className="docs-list-page">
      <header className="docs-header">
        <div className="docs-header-left">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#4285F4"/>
            <path d="M10 28V12h12l8 8v8H10z" fill="white" fillOpacity=".9"/>
            <path d="M22 12v8h8" fill="none" stroke="white" strokeWidth="1.5"/>
          </svg>
          <h1>Docs</h1>
        </div>
        <div className="docs-header-right">
          <ThemeToggle />
          <span className="user-name">{user?.name}</span>
          <button className="btn-logout" onClick={() => dispatch(logout())}>
            Sign out
          </button>
        </div>
      </header>

      {/* Create new doc bar */}
      <div className="docs-create-bar">
        <div className="docs-create-card" onClick={handleCreate}>
          <div className="create-icon">+</div>
          <span>Blank document</span>
        </div>
      </div>

      {/* Docs list */}
      <div className="docs-list-section">
        <div className="docs-list-header">
          <span>Recent documents</span>
        </div>

        {loading && <div className="docs-loading">Loading…</div>}

        <div className="docs-grid">
          {list && list.length > 0 ? (
            list.map((doc) => (
              <div
                key={doc._id}
                className="doc-card"
                onClick={() => navigate(`/docs/${doc._id}`)}
              >
                <div className="doc-card-preview">
                  <svg width="48" height="60" viewBox="0 0 48 60" fill="none">
                    <rect width="48" height="60" rx="4" fill="#fff" stroke="#e0e0e0"/>
                    <rect x="8" y="12" width="32" height="3" rx="1.5" fill="#e0e0e0"/>
                    <rect x="8" y="20" width="28" height="2" rx="1" fill="#e0e0e0"/>
                    <rect x="8" y="26" width="32" height="2" rx="1" fill="#e0e0e0"/>
                    <rect x="8" y="32" width="20" height="2" rx="1" fill="#e0e0e0"/>
                  </svg>
                </div>
                <div className="doc-card-info">
                  <span className="doc-card-title">{doc.title}</span>
                  <span className="doc-card-date">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="doc-card-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(deleteDoc(doc._id));
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            !loading && <div className="docs-empty">No documents yet. Create one to get started!</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocsListPage;