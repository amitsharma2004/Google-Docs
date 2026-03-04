import { useState } from 'react';

interface CommentButtonProps {
  position: { top: number; left: number };
  onAddComment: (comment: string) => void;
  onCancel: () => void;
}

export default function CommentButton({ position, onAddComment, onCancel }: CommentButtonProps) {
  const [isWriting, setIsWriting] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleSubmit = () => {
    console.log('CommentButton handleSubmit called');
    console.log('Comment text:', commentText);
    if (commentText.trim()) {
      console.log('Calling onAddComment with:', commentText);
      onAddComment(commentText);
      setCommentText('');
      setIsWriting(false);
    } else {
      console.log('Comment text is empty, not submitting');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
      }}
    >
      {!isWriting ? (
        <button
          onClick={() => setIsWriting(true)}
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
              onClick={handleSubmit}
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
              onClick={onCancel}
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
  );
}
