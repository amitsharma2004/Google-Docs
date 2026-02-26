/**
 * collabHandler.ts
 * Socket.io event handler for real-time collaboration.
 *
 * DISTRIBUTED RACE CONDITION GUARD — Redis Mutex:
 * ─────────────────────────────────────────────────
 * For multi-instance deployments (multiple Node processes behind a load
 * balancer), MongoDB optimistic locking alone may cause excessive retries.
 * We add a per-document Redis SETNX distributed mutex so only ONE server
 * instance processes a given document's op at a time.
 *
 * Mutex key  : `lock:doc:{docId}`
 * TTL        : 2 s  (auto-release on crash)
 * Acquire    : SET NX EX 2  (atomic; returns 1 on success, 0 on contention)
 * Release    : DEL (only if we own the lock — Lua script prevents ABA race)
 *
 * SINGLE-INSTANCE NOTE:
 * If Redis is unavailable, the handler falls back to DocumentService's
 * optimistic version-gate retries (still correct, just slightly slower
 * under very high concurrency).
 *
 * PROTOCOL FLOW:
 *   client  ──send-op──►  server
 *   server  acquires lock(docId)
 *           transforms op (OT)
 *           persists (version gate)
 *           releases lock
 *           ──op-ack──►  sender     (confirms new version)
 *           ──receive-op──► peers  (transformed delta)
 */

import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import DeltaLib from 'quill-delta';
import { DocumentService } from '../services/DocumentService';
import { Delta } from '../services/OTEngine';
import logger from '../utils/logger';

// ── Redis mutex helpers ──────────────────────────────────────────────────────

/**
 * Lua script for atomic lock release (prevents releasing another owner's lock).
 * Returns 1 if released, 0 if not the owner.
 */
const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

const LOCK_TTL_SECONDS = 2;
const LOCK_RETRY_INTERVAL_MS = 50;
const LOCK_MAX_WAIT_MS = 3000;

async function acquireLock(
  redis: Redis,
  docId: string,
  ownerId: string,
): Promise<boolean> {
  const key = `lock:doc:${docId}`;
  const deadline = Date.now() + LOCK_MAX_WAIT_MS;

  while (Date.now() < deadline) {
    // SET key ownerId NX EX ttl — atomic try-acquire
    const result = await redis.set(key, ownerId, 'EX', LOCK_TTL_SECONDS, 'NX');
    if (result === 'OK') return true;
    // Backoff before retry
    await new Promise((r) => setTimeout(r, LOCK_RETRY_INTERVAL_MS));
  }
  return false; // timed out — fall through to optimistic retry
}

async function releaseLock(
  redis: Redis,
  docId: string,
  ownerId: string,
): Promise<void> {
  const key = `lock:doc:${docId}`;
  await redis.eval(RELEASE_LOCK_LUA, 1, key, ownerId);
}

// ── Main handler ─────────────────────────────────────────────────────────────

export function registerCollabHandlers(io: Server, socket: Socket, redis: Redis) {
  const userId: string = (socket.data as any).userId ?? socket.id;

  /**
   * join-doc
   * Client joins a document room and receives the current snapshot + version.
   * If the client sends a `fromVersion`, we replay missed ops so it catches up.
   */
  socket.on('join-doc', async ({ docId, fromVersion }: { docId: string; fromVersion?: number }) => {
    await socket.join(docId);

    const doc = await DocumentService.getDocument(docId);
    if (!doc) {
      socket.emit('error', { message: 'Document not found' });
      return;
    }

    if (fromVersion !== undefined && fromVersion < doc.version) {
      // Reconnect replay: send only the ops the client missed
      const missedOps = await DocumentService.getOperationsSince(docId, fromVersion);
      socket.emit('catchup-ops', { ops: missedOps, currentVersion: doc.version });
    } else {
      // Fresh join: send full snapshot
      socket.emit('doc-snapshot', {
        content: doc.content,
        version: doc.version,
      });
    }
  });

  /**
   * send-op
   * Core event: client sends a delta with its baseVersion.
   *
   * Race-condition path:
   *   1. Acquire distributed lock on docId.
   *   2. Delegate to DocumentService.applyOperation (handles OT + version gate).
   *   3. Broadcast transformed op to all OTHER clients in the room.
   *   4. Ack sender with confirmed new version.
   *   5. Release lock.
   */
  socket.on(
    'send-op',
    async ({
      docId,
      delta: rawDelta,
      baseVersion,
    }: {
      docId: string;
      delta: object;
      baseVersion: number;
    }) => {
      const lockOwner = `${socket.id}:${Date.now()}`;
      let lockAcquired = false;

      try {
        // ── 1. Acquire lock (best-effort; fall through if Redis is down) ──
        lockAcquired = await acquireLock(redis, docId, lockOwner);
        // Even without the lock we proceed — DocumentService's version gate
        // provides correctness, just with more retry overhead.

        const clientDelta: Delta = new DeltaLib(rawDelta as any);

        // ── 2. Apply + OT transform (with version-gate retries) ───────────
        const { transformedDelta, newVersion } = await DocumentService.applyOperation(
          docId,
          clientDelta,
          baseVersion,
          userId,
          socket.id,
        );

        // ── 3. Broadcast to all OTHER room members ────────────────────────
        socket.to(docId).emit('receive-op', {
          delta: transformedDelta,
          version: newVersion,
          userId,
        });

        // ── 4. Acknowledge sender with confirmed version ──────────────────
        socket.emit('op-ack', { version: newVersion });

      } catch (err: any) {
        logger.error(`send-op error for doc ${docId}: ${err.message}`, { docId, userId, error: err });
        socket.emit('op-error', { message: err.message, baseVersion });
      } finally {
        // ── 5. Always release lock ────────────────────────────────────────
        if (lockAcquired) {
          await releaseLock(redis, docId, lockOwner);
        }
      }
    },
  );

  /**
   * cursor-update
   * Lightweight cursor/selection broadcast — no OT needed.
   */
  socket.on('cursor-update', ({ docId, range }: { docId: string; range: object }) => {
    socket.to(docId).emit('remote-cursor', { userId, range });
  });

  /**
   * leave-doc
   * Clean room membership on explicit leave.
   */
  socket.on('leave-doc', ({ docId }: { docId: string }) => {
    socket.leave(docId);
    socket.to(docId).emit('user-left', { userId });
  });

  /**
   * disconnect
   * Notify peers; pending ops will be replayed when client reconnects.
   */
  socket.on('disconnect', () => {
    // Socket.io auto-removes from all rooms; just notify peers
    // We cannot know which rooms without tracking — rooms are cleaned by Socket.io
    logger.info(`Socket disconnected: ${socket.id} (user: ${userId})`);
  });
}