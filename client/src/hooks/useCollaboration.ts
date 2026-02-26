/**
 * useCollaboration.ts
 * Client-side hook that manages OT state and Socket.io messaging.
 *
 * RACE CONDITION GUARD — Pending Ops Buffer:
 * ────────────────────────────────────────────
 * The client MUST NOT send a new op until the previous one is acknowledged.
 * If the user types while waiting for an ack, the new delta is held in
 * `pendingOp` (composed with any subsequent local edits).
 *
 *   User types A  → sent immediately  (inFlight = A, pending = null)
 *   User types B  → buffered           (inFlight = A, pending = B)
 *   Ack(A, v=3)   → send pending       (inFlight = B@v3, pending = null)
 *
 * WHY THIS MATTERS:
 * Without buffering, two ops with the same baseVersion arrive at the server
 * simultaneously from the SAME client — the server's OT handles it correctly,
 * but the client's local Quill state diverges because it applied B on top of A
 * without transforming B against the server's acknowledgment of A.
 * The buffer keeps the client's baseVersion synchronized with the server's
 * last-acked version, eliminating this class of client-side race.
 *
 * REMOTE OP TRANSFORM:
 * When a remote op arrives while we have an in-flight op, we cannot apply the
 * remote op directly — it was based on a version before our in-flight op.
 * We transform the remote op against our in-flight + pending ops so the
 * editor reflects the correct merged state.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import DeltaLib from 'quill-delta';
import type Quill from 'quill';

type Delta = InstanceType<typeof DeltaLib>;

interface UseCollaborationOptions {
  socket: Socket;
  quillRef: React.MutableRefObject<Quill | null>;
  docId: string;
  userId: string;
}

export function useCollaboration({
  socket,
  quillRef,
  docId,
  userId,
}: UseCollaborationOptions) {
  /**
   * knownVersion — the server version we last received an ack or snapshot for.
   * All outgoing ops use this as their baseVersion.
   */
  const knownVersion = useRef<number>(0);

  /**
   * inFlightOp — the op we have sent but not yet received an ack for.
   * null when channel is idle.
   */
  const inFlightOp = useRef<Delta | null>(null);

  /**
   * pendingOp — local edits composed while waiting for an ack.
   * Sent immediately upon ack receipt.
   */
  const pendingOp = useRef<Delta | null>(null);

  // ── Outbound: send inFlightOp to server ───────────────────────────────────

  const flushInflight = useCallback(() => {
    if (!inFlightOp.current) return;
    socket.emit('send-op', {
      docId,
      delta: inFlightOp.current,
      baseVersion: knownVersion.current,
    });
  }, [socket, docId]);

  // ── Handle local Quill text-change ───────────────────────────────────────

  /**
   * onLocalChange — called by Quill's `text-change` event (source === 'user').
   * Buffers the delta into inFlight or pending depending on channel state.
   */
  const onLocalChange = useCallback(
    (delta: Delta) => {
      if (inFlightOp.current === null) {
        // Channel is idle — send immediately
        inFlightOp.current = delta;
        flushInflight();
      } else {
        // In-flight op outstanding — compose into pending buffer
        pendingOp.current = pendingOp.current
          ? pendingOp.current.compose(delta)
          : delta;
      }
    },
    [flushInflight],
  );

  // ── Handle op-ack from server ─────────────────────────────────────────────

  useEffect(() => {
    const handleAck = ({ version }: { version: number }) => {
      // Server confirmed our in-flight op at `version`
      knownVersion.current = version;
      inFlightOp.current = null;

      // If we have buffered local edits, promote and send
      if (pendingOp.current) {
        inFlightOp.current = pendingOp.current;
        pendingOp.current = null;
        flushInflight();
      }
    };

    socket.on('op-ack', handleAck);
    return () => { socket.off('op-ack', handleAck); };
  }, [socket, flushInflight]);

  // ── Handle remote ops from server ────────────────────────────────────────

  useEffect(() => {
    const handleRemoteOp = ({
      delta: rawDelta,
      version,
    }: {
      delta: object;
      version: number;
      userId: string;
    }) => {
      const quill = quillRef.current;
      if (!quill) return;

      let remoteDelta = new DeltaLib(rawDelta as any);

      /**
       * REMOTE OP TRANSFORM:
       * If we have an in-flight op (and possibly a pending op), the remote
       * op was committed BEFORE the server saw our in-flight op.
       * We must transform the remote delta "over" our optimistic local ops
       * so it applies to our current local state correctly.
       *
       *   Server state:   v_n  ──remoteOp──► v_n+1
       *   Our local state: v_n ──inFlight──► local
       *
       * We need: transform(remoteOp, inFlight ∘ pending)
       */
      if (inFlightOp.current) {
        let localAhead = inFlightOp.current;

        // Compose pending into the local-ahead delta if present
        if (pendingOp.current) {
          localAhead = localAhead.compose(pendingOp.current);
        }

        // transform(remote, localAhead, priority=true) → remote wins ties
        remoteDelta = localAhead.transform(remoteDelta, true);

        // Also transform our in-flight against the remote so we don't
        // double-apply content when the server eventually sees our op.
        inFlightOp.current = remoteDelta.transform(inFlightOp.current, false);

        if (pendingOp.current) {
          pendingOp.current = remoteDelta.transform(pendingOp.current, false);
        }
      }

      // Apply the transformed remote delta to Quill — source='api' prevents
      // re-triggering onLocalChange
      quill.updateContents(remoteDelta as any, 'api');
      knownVersion.current = version;
    };

    socket.on('receive-op', handleRemoteOp);
    return () => { socket.off('receive-op', handleRemoteOp); };
  }, [socket, quillRef]);

  // ── Handle catchup-ops on reconnect ──────────────────────────────────────

  useEffect(() => {
    const handleCatchup = ({
      ops,
      currentVersion,
    }: {
      ops: Array<{ delta: object; version: number }>;
      currentVersion: number;
    }) => {
      const quill = quillRef.current;
      if (!quill) return;

      // Replay all missed ops in order
      ops.forEach(({ delta }) => {
        quill.updateContents(new DeltaLib(delta as any) as any, 'api');
      });

      knownVersion.current = currentVersion;
    };

    socket.on('catchup-ops', handleCatchup);
    return () => { socket.off('catchup-ops', handleCatchup); };
  }, [socket, quillRef]);

  // ── Handle snapshot on fresh join ────────────────────────────────────────

  useEffect(() => {
    const handleSnapshot = ({ content, version }: { content: object; version: number }) => {
      const quill = quillRef.current;
      if (!quill) return;
      quill.setContents(new DeltaLib(content as any) as any, 'api');
      knownVersion.current = version;
    };

    socket.on('doc-snapshot', handleSnapshot);
    return () => { socket.off('doc-snapshot', handleSnapshot); };
  }, [socket, quillRef]);

  // ── Handle server-reported op error (e.g., max retries exceeded) ─────────

  useEffect(() => {
    const handleOpError = ({ message }: { message: string }) => {
      console.error('[useCollaboration] op-error:', message);
      // Re-sync: re-join the doc to get the latest snapshot
      socket.emit('join-doc', { docId, fromVersion: knownVersion.current });
      // Clear local op queue to avoid re-sending stale data
      inFlightOp.current = null;
      pendingOp.current = null;
    };

    socket.on('op-error', handleOpError);
    return () => { socket.off('op-error', handleOpError); };
  }, [socket, docId]);

  // ── Join doc room on mount ────────────────────────────────────────────────

  useEffect(() => {
    socket.emit('join-doc', { docId, fromVersion: knownVersion.current });
    return () => {
      socket.emit('leave-doc', { docId });
    };
  }, [socket, docId]);

  // ── Public API ────────────────────────────────────────────────────────────

  return { onLocalChange };
}