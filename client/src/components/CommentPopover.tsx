import { useState, useRef } from 'react';

interface Reply {
  _id: string;
  author: { username: string; email: string };
  comment: string;
  created_at: string;
}

interface Comment {
  _id: string;
  author: { username: string; email: string };
  comment: string;
  selected_text: string;
  replies: Reply[];
  created_at: string;
}

interface CommentPopoverProps {
  comment: Comment;
  position: { top: number; left: number };
  onAddReply: (commentId: string, reply: string) => void;
  onClose: () => void;
}

export default function CommentPopover({ comment, position, onAddReply, onClose }: CommentPopoverProps) {
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onAddReply(comment._id, replyText);
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Close after a small delay
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div
      data-comment-popover
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
        backgroundColor: '#ffffff',
        boxShadow: isHovered 
          ? '0 25px 30px -5px rgba(0, 0, 0, 0.15), 0 15px 15px -5px rgba(0, 0, 0, 0.08)'
          : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        width: '320px',
        maxHeight: '400px',
        overflowY: 'auto',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
            "{comment.selected_text}"
          </div>
          <button
            onClick={onClose}
            style={{
              color: '#9ca3af',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0',
              lineHeight: '1',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#4b5563';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
              {comment.author.username}
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#374151', margin: '0' }}>{comment.comment}</p>
        </div>

        {comment.replies.length > 0 && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginBottom: '12px' }}>
            {comment.replies.map((reply) => (
              <div key={reply._id} style={{ marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #d1d5db' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>
                    {reply.author.username}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    {new Date(reply.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', margin: '0' }}>{reply.comment}</p>
              </div>
            ))}
          </div>
        )}

        {!showReplyInput ? (
          <button
            onClick={() => setShowReplyInput(true)}
            style={{
              fontSize: '14px',
              color: '#2563eb',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              textDecoration: 'underline',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#2563eb';
            }}
          >
            Reply
          </button>
        ) : (
          <div style={{ marginTop: '8px' }}>
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
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
              rows={2}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim()}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  backgroundColor: replyText.trim() ? '#2563eb' : '#93c5fd',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => {
                  if (replyText.trim()) {
                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (replyText.trim()) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
              >
                Reply
              </button>
              <button
                onClick={() => setShowReplyInput(false)}
                style={{
                  padding: '6px 12px',
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
    </div>
  );
}
