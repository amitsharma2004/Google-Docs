/**
 * Editor.tsx — Collaborative Quill editor component.
 *
 * Integrates:
 *  - Quill.js for rich text editing
 *  - useCollaboration hook for OT delta buffering + Socket.io transport
 *  - Displays active collaborator cursors (username + colored indicator)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { Socket } from 'socket.io-client';
import { useCollaboration } from '../hooks/useCollaboration';
import ThemeToggle from './ThemeToggle';

interface EditorProps {
  docId: string;
  userId: string;
  socket: Socket;
  title: string;
  onTitleChange?: (title: string) => void;
  onBack?: () => void;
}

interface CursorInfo {
  userId: string;
  range: { index: number; length: number } | null;
  color: string;
}

// Assign a stable color per userId
const CURSOR_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
];
const colorMap = new Map<string, string>();
function getColor(uid: string): string {
  if (!colorMap.has(uid)) {
    colorMap.set(uid, CURSOR_COLORS[colorMap.size % CURSOR_COLORS.length]);
  }
  return colorMap.get(uid)!;
}

// Quill toolbar configuration
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  ['clean'],
];

const Editor: React.FC<EditorProps> = ({
  docId,
  userId,
  socket,
  title,
  onTitleChange,
  onBack,
}) => {
  const editorRef  = useRef<HTMLDivElement>(null);
  const quillRef   = useRef<Quill | null>(null);
  const [cursors, setCursors]         = useState<Map<string, CursorInfo>>(new Map());
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle]   = useState(title);

  // ── Initialise Quill once ────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    // Clear any existing Quill instances
    editorRef.current.innerHTML = '';

    quillRef.current = new Quill(editorRef.current, {
      theme: 'snow',
      modules: { 
        toolbar: {
          container: TOOLBAR_OPTIONS,
        }
      },
      placeholder: 'Start typing to collaborate…',
    });

    return () => {
      if (quillRef.current) {
        // Clean up Quill instance
        const container = quillRef.current.container;
        if (container && container.parentNode) {
          container.innerHTML = '';
        }
        quillRef.current = null;
      }
    };
  }, []);

  // ── Wire OT collaboration ────────────────────────────────────────────
  const { onLocalChange } = useCollaboration({ socket, quillRef, docId, userId });

  // Forward Quill text-change events to the hook (source='user' only)
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const handler = (delta: any, _old: any, source: string) => {
      if (source === 'user') onLocalChange(delta);
    };

    quill.on('text-change', handler);
    return () => { quill.off('text-change', handler); };
  }, [onLocalChange]);

  // ── Remote cursor tracking ───────────────────────────────────────────
  useEffect(() => {
    const handleCursor = ({ userId: remoteId, range }: { userId: string; range: any }) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(remoteId, { userId: remoteId, range, color: getColor(remoteId) });
        return next;
      });
    };

    const handleUserLeft = ({ userId: remoteId }: { userId: string }) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(remoteId);
        return next;
      });
    };

    socket.on('remote-cursor', handleCursor);
    socket.on('user-left', handleUserLeft);
    return () => {
      socket.off('remote-cursor', handleCursor);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket]);

  // Broadcast local cursor position on selection-change
  const onSelectionChange = useCallback(
    (range: any) => {
      socket.emit('cursor-update', { docId, range });
    },
    [socket, docId],
  );

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    quill.on('selection-change', onSelectionChange);
    return () => { quill.off('selection-change', onSelectionChange); };
  }, [onSelectionChange]);

  // ── Title editing ────────────────────────────────────────────────────
  const commitTitle = () => {
    setEditingTitle(false);
    if (localTitle.trim() && onTitleChange) onTitleChange(localTitle.trim());
  };

  return (
    <div className="editor-wrapper">
      {/* Document title bar */}
      <div className="editor-titlebar">
        {onBack && (
          <button className="btn-back" onClick={onBack} title="Back to documents">
            ← 
          </button>
        )}
        
        {editingTitle ? (
          <input
            className="editor-title-input"
            value={localTitle}
            autoFocus
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
          />
        ) : (
          <h1
            className="editor-title"
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
          >
            {localTitle || 'Untitled Document'}
          </h1>
        )}

        {/* Active collaborators indicator */}
        <div className="editor-collaborators">
          <ThemeToggle />
          {Array.from(cursors.values()).map((c) => (
            <span
              key={c.userId}
              className="collaborator-badge"
              style={{ backgroundColor: c.color }}
              title={c.userId}
            >
              {c.userId.slice(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Quill editor mount point */}
      <div className="editor-container" ref={editorRef} />
    </div>
  );
};

export default Editor;