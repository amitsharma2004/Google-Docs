/**
 * ShareModal.tsx - Modal for sharing document with permission control and link generation
 */

import React, { useState, useEffect } from 'react';

interface ShareModalProps {
  docId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Collaborator {
  userId: string;
  username: string;
  email: string;
  permission: 'read' | 'write';
  addedAt: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ docId, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'write'>('write');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Link generation states
  const [linkPermission, setLinkPermission] = useState<'read' | 'write'>('read');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  // Load collaborators
  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
    }
  }, [isOpen, docId]);

  const loadCollaborators = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/docs/${docId}/collaborators`,
        { 
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators);
      }
    } catch (err) {
      // Silently fail - collaborators will be empty
    }
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/docs/${docId}/generate-link`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ permission: linkPermission }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setGeneratedLink(data.shareUrl);
        setSuccess(`${linkPermission === 'read' ? 'Read-only' : 'Edit'} link generated!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to generate link');
      }
    } catch (err) {
      setError('Failed to generate link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silently fail - clipboard copy failed
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/docs/${docId}/share`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email, permission }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Document shared with ${email}`);
        setEmail('');
        loadCollaborators();
      } else {
        setError(data.error || 'Failed to share document');
      }
    } catch (err) {
      setError('Failed to share document');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h2>Share Document</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Generate shareable link */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              🔗 Generate Shareable Link
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Create a link that anyone can use to access this document
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Link Permission
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label key="link-read" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1, padding: '12px', border: `2px solid ${linkPermission === 'read' ? '#3b82f6' : 'var(--border-color)'}`, borderRadius: '6px', backgroundColor: linkPermission === 'read' ? '#eff6ff' : 'transparent' }}>
                  <input
                    type="radio"
                    value="read"
                    checked={linkPermission === 'read'}
                    onChange={(e) => setLinkPermission(e.target.value as 'read')}
                    style={{ marginRight: '8px' }}
                  />
                  <span>
                    <strong style={{ display: 'block' }}>👁️ View only</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Can view and comment
                    </span>
                  </span>
                </label>
                <label key="link-write" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1, padding: '12px', border: `2px solid ${linkPermission === 'write' ? '#3b82f6' : 'var(--border-color)'}`, borderRadius: '6px', backgroundColor: linkPermission === 'write' ? '#eff6ff' : 'transparent' }}>
                  <input
                    type="radio"
                    value="write"
                    checked={linkPermission === 'write'}
                    onChange={(e) => setLinkPermission(e.target.value as 'write')}
                    style={{ marginRight: '8px' }}
                  />
                  <span>
                    <strong style={{ display: 'block' }}>✏️ Can edit</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Full access
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={handleGenerateLink}
              disabled={generatingLink}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {generatingLink ? 'Generating...' : 'Generate Link'}
            </button>

            {generatedLink && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    backgroundColor: '#fff',
                  }}
                />
                <button 
                  onClick={() => copyToClipboard(generatedLink)}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Share with specific user */}
          <form onSubmit={handleShare} style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              👤 Share with specific user
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label key="user-read" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="read"
                    checked={permission === 'read'}
                    onChange={(e) => setPermission(e.target.value as 'read')}
                    style={{ marginRight: '6px' }}
                  />
                  <span style={{ fontSize: '14px' }}>Read only</span>
                </label>
                <label key="user-write" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="write"
                    checked={permission === 'write'}
                    onChange={(e) => setPermission(e.target.value as 'write')}
                    style={{ marginRight: '6px' }}
                  />
                  <span style={{ fontSize: '14px' }}>Can edit</span>
                </label>
              </div>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', fontSize: '14px', marginBottom: '12px' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '8px 12px', backgroundColor: '#efe', color: '#060', borderRadius: '4px', fontSize: '14px', marginBottom: '12px' }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Sharing...' : 'Share'}
            </button>
          </form>

          {/* Collaborators list */}
          {collaborators.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                People with access ({collaborators.length})
              </h3>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {collaborators.map((collab) => (
                  <div
                    key={collab.userId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{collab.username}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{collab.email}</div>
                    </div>
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: collab.permission === 'write' ? '#e0f2fe' : '#fef3c7',
                        color: collab.permission === 'write' ? '#0369a1' : '#92400e',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {collab.permission === 'write' ? 'Can edit' : 'Read only'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
