/**
 * DocEditorPage.tsx — Full-screen collaborative editor page.
 * Creates a Socket.io connection for the session lifetime.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import Editor from '../components/Editor';
import { updateDocTitle, setCurrentDoc } from '../store/docSlice';
import type { AppDispatch, RootState } from '../store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';

const DocEditorPage: React.FC = () => {
  const { docId }  = useParams<{ docId: string }>();
  const navigate   = useNavigate();
  const dispatch   = useDispatch<AppDispatch>();
  const { token, user } = useSelector((s: RootState) => s.auth);
  const { current }     = useSelector((s: RootState) => s.docs);

  // Create socket once per page mount, destroyed on unmount
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !docId) { 
      console.log('[DocEditor] Missing token or docId, redirecting...', { token: !!token, docId });
      navigate('/'); 
      return; 
    }

    console.log('[DocEditor] Creating socket connection...', { SOCKET_URL, docId });
    
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('[Socket] Connected successfully');
      setIsConnected(true);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('[Socket] connect error:', err.message);
      setIsConnected(false);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    return () => {
      console.log('[DocEditor] Cleaning up socket connection');
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      dispatch(setCurrentDoc(null));
    };
  }, [token, docId, navigate, dispatch]);

  const handleTitleChange = (title: string) => {
    if (!docId) return;
    dispatch(updateDocTitle({ docId, title }));
  };

  // Show loading state while connecting
  if (!socketRef.current || !isConnected || !docId || !user) {
    const reasons = [];
    if (!socketRef.current) reasons.push('socket not created');
    if (!isConnected) reasons.push('not connected');
    if (!docId) reasons.push('no docId');
    if (!user) reasons.push('no user');
    
    console.log('[DocEditor] Waiting...', reasons);
    
    return (
      <div className="editor-loading">
        <div>Connecting…</div>
        {reasons.length > 0 && (
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.6 }}>
            {reasons.join(', ')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="editor-page">
      <Editor
        docId={docId}
        userId={user.id}
        socket={socketRef.current}
        title={current?.title ?? 'Untitled Document'}
        onTitleChange={handleTitleChange}
        onBack={() => navigate('/')}
      />
    </div>
  );
};

export default DocEditorPage;