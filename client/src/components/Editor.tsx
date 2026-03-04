/**
 * Editor.tsx — Collaborative Quill editor component.
 *
 * Integrates:
 *  - Quill.js for rich text editing
 *  - useCollaboration hook for OT delta buffering + Socket.io transport
 *  - Displays active collaborator cursors (username + colored indicator)
 *  - Comment system for text annotations
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { Socket } from 'socket.io-client';
import { useCollaboration } from '../hooks/useCollaboration';
import ThemeToggle from './ThemeToggle';
import ShareModal from './ShareModal';
import CommentPopover from './CommentPopover';

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

interface Comment {
  _id: string;
  document_id: string;
  start_offset: number;
  end_offset: number;
  start_path: number[];
  end_path: number[];
  selected_text: string;
  comment: string;
  author: { username: string; email: string };
  replies: {
    _id: string;
    author: { username: string; email: string };
    comment: string;
    created_at: string;
  }[];
  created_at: string;
}

interface SelectionData {
  text: string;
  startOffset: number;
  endOffset: number;
  startPath: number[];
  endPath: number[];
  position: { top: number; left: number };
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
  const [cursors, setCursors] = useState<Map<string, CursorInfo>>(new Map());
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectionData, setSelectionData] = useState<SelectionData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hoveredComment, setHoveredComment] = useState<Comment | null>(null);
  const [commentPopoverPosition, setCommentPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');

  // ── Helper: Generate DOM path ────────────────────────────────────────
  const getDomPath = useCallback((node: Node): number[] => {
    const path: number[] = [];
    let current: Node | null = node;
    
    while (current && current.parentNode) {
      const parent: Node = current.parentNode;
      const index = Array.prototype.indexOf.call(parent.childNodes, current);
      path.unshift(index);
      current = parent;
      
      // Stop at editor container
      if (current === editorRef.current) break;
    }
    
    return path;
  }, []);

  // ── Restore selection from DOM path ──────────────────────────────────
  const restoreSelection = useCallback((startPath: number[], endPath: number[], startOffset: number, endOffset: number): Range | null => {
    if (!editorRef.current) return null;
    
    try {
      const getNodeFromPath = (path: number[]): Node | null => {
        let node: Node = editorRef.current!;
        for (const index of path) {
          if (node.childNodes[index]) {
            node = node.childNodes[index];
          } else {
            return null;
          }
        }
        return node;
      };

      const startNode = getNodeFromPath(startPath);
      const endNode = getNodeFromPath(endPath);
      
      if (!startNode || !endNode) return null;

      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      
      return range;
    } catch (error) {
      console.error('Error restoring selection:', error);
      return null;
    }
  }, []);

  // ── Highlight comments in editor ─────────────────────────────────────
  const highlightComments = useCallback((commentsToHighlight: Comment[]) => {
    if (!editorRef.current) return;
    
    // Remove existing highlights
    const existingHighlights = editorRef.current.querySelectorAll('.comment-highlight');
    existingHighlights.forEach((el: Element) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      }
    });

    // Add new highlights
    commentsToHighlight.forEach(comment => {
      try {
        const range = restoreSelection(comment.start_path, comment.end_path, comment.start_offset, comment.end_offset);
        if (range) {
          const span = document.createElement('span');
          span.className = 'comment-highlight';
          span.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
          span.style.cursor = 'pointer';
          span.style.transition = 'background-color 0.2s ease';
          span.dataset.commentId = comment._id;
          
          span.addEventListener('mouseenter', (e) => {
            span.style.backgroundColor = 'rgba(255, 235, 59, 0.5)';
            setHoveredComment(comment);
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            setCommentPopoverPosition({ top: rect.bottom + 5, left: rect.left });
          });
          
          span.addEventListener('mouseleave', (e) => {
            span.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
            // Check if mouse is moving to the popover
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!relatedTarget?.closest('[data-comment-popover]')) {
              // Delay closing to allow moving to popover
              setTimeout(() => {
                const popover = document.querySelector('[data-comment-popover]:hover');
                if (!popover) {
                  setHoveredComment(null);
                  setCommentPopoverPosition(null);
                }
              }, 100);
            }
          });
          
          range.surroundContents(span);
        }
      } catch (error) {
        console.error('Error highlighting comment:', error);
      }
    });
  }, [restoreSelection]);

  // ── Add comment ──────────────────────────────────────────────────────
  const handleAddComment = useCallback(async () => {
    console.log('handleAddComment called');
    console.log('commentText:', commentText);
    console.log('selectionData:', selectionData);
    
    if (!selectionData || !commentText.trim()) {
      console.log('No selection data or empty comment, returning');
      return;
    }

    const payload = {
      document_id: docId,
      start_offset: selectionData.startOffset,
      end_offset: selectionData.endOffset,
      start_path: selectionData.startPath,
      end_path: selectionData.endPath,
      selected_text: selectionData.text,
      comment: commentText,
    };
    
    console.log('Sending comment payload:', payload);
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/comments`;
    console.log('API URL:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const newComment = await response.json();
        console.log('New comment created:', newComment);
        setComments(prev => {
          const updated = [...prev, newComment];
          highlightComments(updated);
          return updated;
        });
        setSelectionData(null);
        setShowCommentInput(false);
        setCommentText('');
        
        // Clear selection
        window.getSelection()?.removeAllRanges();
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, [selectionData, docId, highlightComments, commentText]);

  // ── Add reply ────────────────────────────────────────────────────────
  const handleAddReply = useCallback(async (commentId: string, replyText: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: replyText }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        setComments(prev => prev.map((c: Comment) => c._id === commentId ? updatedComment : c));
        setHoveredComment(updatedComment);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  }, []);

  // ── Initialise Quill once ────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    // Clear any existing Quill instances and toolbars
    editorRef.current.innerHTML = '';
    
    // Remove ALL orphaned toolbars in the entire document
    const removeOrphanedToolbars = () => {
      const allToolbars = document.querySelectorAll('.ql-toolbar');
      allToolbars.forEach(toolbar => {
        // Remove if it's not followed by a container or if it's a duplicate
        const nextSibling = toolbar.nextElementSibling;
        if (!nextSibling?.classList.contains('ql-container')) {
          toolbar.remove();
        }
      });
    };

    removeOrphanedToolbars();

    quillRef.current = new Quill(editorRef.current, {
      theme: 'snow',
      modules: { 
        toolbar: TOOLBAR_OPTIONS,
      },
      placeholder: 'Start typing to collaborate…',
    });

    // Remove any duplicate toolbars that might have been created
    setTimeout(() => {
      const toolbarsInEditor = editorRef.current?.querySelectorAll('.ql-toolbar');
      if (toolbarsInEditor && toolbarsInEditor.length > 1) {
        // Keep only the first toolbar
        for (let i = 1; i < toolbarsInEditor.length; i++) {
          toolbarsInEditor[i].remove();
        }
      }
    }, 100);

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

  // ── Load comments on mount ───────────────────────────────────────────
  useEffect(() => {
    const loadComments = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/comments/document/${docId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setComments(data);
          highlightComments(data);
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };
    
    loadComments();
  }, [docId, highlightComments]);

  // ── Listen for real-time comment updates ─────────────────────────────
  useEffect(() => {
    const handleCommentAdded = (newComment: Comment) => {
      console.log('New comment received via socket:', newComment);
      setComments(prev => {
        const updated = [...prev, newComment];
        highlightComments(updated);
        return updated;
      });
    };

    const handleCommentReplyAdded = (updatedComment: Comment) => {
      console.log('Comment reply received via socket:', updatedComment);
      setComments(prev => {
        const updated = prev.map(c => c._id === updatedComment._id ? updatedComment : c);
        return updated;
      });
      // Update hovered comment if it's the one that was updated
      if (hoveredComment?._id === updatedComment._id) {
        setHoveredComment(updatedComment);
      }
    };

    const handleCommentDeleted = ({ commentId }: { commentId: string }) => {
      console.log('Comment deleted via socket:', commentId);
      setComments(prev => {
        const updated = prev.filter(c => c._id !== commentId);
        highlightComments(updated);
        return updated;
      });
      // Close popover if the deleted comment was being viewed
      if (hoveredComment?._id === commentId) {
        setHoveredComment(null);
        setCommentPopoverPosition(null);
      }
    };

    socket.on('comment-added', handleCommentAdded);
    socket.on('comment-reply-added', handleCommentReplyAdded);
    socket.on('comment-deleted', handleCommentDeleted);

    return () => {
      socket.off('comment-added', handleCommentAdded);
      socket.off('comment-reply-added', handleCommentReplyAdded);
      socket.off('comment-deleted', handleCommentDeleted);
    };
  }, [socket, highlightComments, hoveredComment]);

  // ── Handle text selection ────────────────────────────────────────────
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Don't close comment UI if clicking inside it
      const target = e.target as HTMLElement;
      if (target.closest('[data-comment-ui]')) {
        return;
      }

      const selection = window.getSelection();
      const selectedText = selection?.toString() || '';
      
      if (selectedText.length > 0 && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Check if selection is within editor
        if (!editorRef.current?.contains(range.commonAncestorContainer)) {
          return;
        }

        const startPath = getDomPath(range.startContainer);
        const endPath = getDomPath(range.endContainer);
        
        const rect = range.getBoundingClientRect();
        
        setSelectionData({
          text: selectedText,
          startOffset: range.startOffset,
          endOffset: range.endOffset,
          startPath,
          endPath,
          position: {
            top: rect.bottom + window.scrollY + 5,
            left: rect.left + window.scrollX,
          },
        });
      } else if (!showCommentInput) {
        // Only clear selection if comment input is not open
        setSelectionData(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [getDomPath, showCommentInput]);

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
          <button 
            className="btn-share" 
            onClick={() => setShowShareModal(true)}
            title="Share document"
          >
            🔗 Share
          </button>
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

      {/* Custom inline comment button */}
      {selectionData && (
        <div
          data-comment-ui
          style={{
            position: 'absolute',
            top: `${selectionData.position.top}px`,
            left: `${selectionData.position.left}px`,
            zIndex: 1000,
          }}
        >
          {!showCommentInput ? (
            <button
              onClick={() => {
                console.log('Add Comment button clicked');
                setShowCommentInput(true);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2563eb',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eff6ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              💬 Add Comment
            </button>
          ) : (
            <div
              style={{
                padding: '12px',
                width: '280px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <textarea
                autoFocus
                value={commentText}
                onChange={(e) => {
                  console.log('Textarea value changed:', e.target.value);
                  setCommentText(e.target.value);
                }}
                placeholder="Write a comment..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                rows={3}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    console.log('Comment button clicked');
                    handleAddComment();
                  }}
                  disabled={!commentText.trim()}
                  style={{
                    padding: '6px 16px',
                    fontSize: '14px',
                    backgroundColor: commentText.trim() ? '#2563eb' : '#93c5fd',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => {
                    if (commentText.trim()) {
                      e.currentTarget.style.backgroundColor = '#1d4ed8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (commentText.trim()) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }
                  }}
                >
                  Comment
                </button>
                <button
                  onClick={() => {
                    console.log('Cancel button clicked');
                    setSelectionData(null);
                    setShowCommentInput(false);
                    setCommentText('');
                  }}
                  style={{
                    padding: '6px 16px',
                    fontSize: '14px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comment popover on hover */}
      {hoveredComment && commentPopoverPosition && (
        <CommentPopover
          comment={hoveredComment}
          position={commentPopoverPosition}
          onAddReply={handleAddReply}
          onClose={() => {
            setHoveredComment(null);
            setCommentPopoverPosition(null);
          }}
        />
      )}

      {/* Share Modal */}
      <ShareModal 
        docId={docId}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};

export default Editor;
