/**
 * DocumentService.ts
 * Persists document snapshots and the operation log.
 *
 * RACE CONDITION GUARD — Version Gate Pattern:
 * ─────────────────────────────────────────────
 * applyOperation uses a MongoDB conditional update:
 *
 *   findOneAndUpdate({ _id, version: expectedVersion }, { $set: newContent, $inc: { version: 1 } })
 *
 * If two ops arrive simultaneously with the same baseVersion:
 *   - Op A lands first  → version 0→1 succeeds
 *   - Op B arrives next → version guard (version === 0) FAILS → we
 *     transform opB against the committed ops since its baseVersion
 *     and retry → version 1→2 succeeds
 *
 * This guarantees exactly-once application and correct OT convergence
 * without external locks for single-instance deployments.
 * For multi-instance, collabHandler adds a Redis distributed mutex.
 */

import DeltaLib from 'quill-delta';
import DocumentModel, { IDocument } from '../models/Document';
import OperationModel from '../models/Operation';
import { OTEngine, Delta } from './OTEngine';

const MAX_RETRIES = 5;

export class DocumentService {
  /**
   * getDocument — load doc + current version from MongoDB.
   */
  static async getDocument(docId: string): Promise<any> {
    return DocumentModel.findById(docId).lean();
  }

  /**
   * getOperationsSince — fetch op log for replay on reconnect.
   * Returns ops in ascending version order so the client can
   * replay them sequentially to fast-forward its local state.
   */
  static async getOperationsSince(docId: string, fromVersion: number) {
    return OperationModel.find({
      docId,
      version: { $gt: fromVersion },
    })
      .sort({ version: 1 })
      .lean();
  }

  /**
   * applyOperation — core write path.
   *
   * Algorithm:
   * 1. Load committed ops between clientVersion and currentVersion.
   * 2. Transform clientDelta through all those ops (catch-up transform).
   * 3. Attempt a version-gated MongoDB update (optimistic concurrency).
   * 4. If the gate fails (another op sneaked in), reload and retry.
   * 5. Append to op log and return the new document snapshot.
   *
   * @param docId         - Target document ID
   * @param clientDelta   - Raw delta from client (quill-delta instance)
   * @param clientVersion - Client's known server version (baseVersion)
   * @param userId        - Author's user ID
   * @param socketId      - Author's socket ID (excluded from broadcast)
   * @returns             - { transformedDelta, newVersion, doc }
   */
  static async applyOperation(
    docId: string,
    clientDelta: Delta,
    clientVersion: number,
    userId: string,
    socketId: string,
  ): Promise<{ transformedDelta: Delta; newVersion: number; doc: IDocument }> {
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      attempt++;

      // ── Step 1: Load current doc ──────────────────────────────────────
      const doc = await DocumentModel.findById(docId);
      if (!doc) throw new Error(`Document ${docId} not found`);

      const currentVersion = doc.version;

      // ── Step 2: Transform if client is behind ─────────────────────────
      let transformedDelta = clientDelta;

      if (clientVersion < currentVersion) {
        // Fetch every op committed after the client's known version
        const missedOps = await DocumentService.getOperationsSince(docId, clientVersion);

        const missedDeltas: Delta[] = missedOps.map(
          (op) => new DeltaLib(op.delta as any),
        );

        // Transform incoming op through all missed ops (OT catch-up)
        transformedDelta = OTEngine.transformMultiple(clientDelta, missedDeltas);
      }

      // ── Step 3: Compose new content snapshot ──────────────────────────
      const currentContent = new DeltaLib(doc.content as any);
      const newContent = OTEngine.compose(currentContent, transformedDelta);
      const newVersion = currentVersion + 1;

      // ── Step 4: Optimistic version-gated update ───────────────────────
      // The { version: currentVersion } filter is the race condition guard.
      // If another op was committed between our read and write, this
      // update matches 0 documents and we retry.
      const updated = await DocumentModel.findOneAndUpdate(
        { _id: docId, version: currentVersion },           // version gate
        { $set: { content: newContent, version: newVersion } },
        { new: true },
      );

      if (!updated) {
        // Another op won the race — loop back and re-transform
        continue;
      }

      // ── Step 5: Persist op log (best-effort, non-blocking) ───────────
      await OperationModel.create({
        docId,
        version: newVersion,
        delta: transformedDelta,
        userId,
        socketId,
      });

      return { transformedDelta, newVersion, doc: updated };
    }

    throw new Error(
      `applyOperation exceeded ${MAX_RETRIES} retries for doc ${docId}. ` +
      'Too many concurrent writers — consider enabling Redis distributed lock.',
    );
  }

  /**
   * createDocument — bootstrap a blank doc at version 0.
   */
  static async createDocument(title: string, userId: string): Promise<IDocument> {
    return DocumentModel.create({
      title,
      content: { ops: [] },
      version: 0,
      createdBy: userId,
      collaborators: [userId],
    });
  }
}