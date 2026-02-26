/**
 * OTEngine.ts
 * Operational Transformation engine for concurrent document editing.
 *
 * RACE CONDITION STRATEGY:
 * - Every op carries a `baseVersion` (client's known server version).
 * - Server serializes ops with a per-document Redis mutex lock.
 * - When two ops arrive concurrently (same baseVersion), the SECOND op is
 *   transformed against the FIRST before being applied, guaranteeing
 *   convergence on all clients (diamond property of OT).
 *
 *   Client A  ──opA(v0)──►┐
 *                          │ server serializes: applyA → v1
 *   Client B  ──opB(v0)──►│ transform(opB, opA) → opB' → apply → v2
 *                          │ broadcast opA to B, opB' to A
 *                          ▼
 *                    both clients reach v2 with identical content
 */

import DeltaLib from 'quill-delta';

// Re-export so other modules import from one place
export type Delta = InstanceType<typeof DeltaLib>;

export class OTEngine {
  /**
   * transform(clientOp, serverOp)
   * Returns a new delta that achieves the same intent as `clientOp`
   * but applied ON TOP of `serverOp`.
   *
   * Uses quill-delta's built-in OT transform (priority = false means
   * the server op wins ties, preventing duplicate inserts).
   *
   * @param clientOp  - The incoming client delta (baseVersion = N)
   * @param serverOp  - The delta already committed at version N
   * @returns         - Transformed client delta safe to apply at version N+1
   */
  static transform(clientOp: Delta, serverOp: Delta): Delta {
    // quill-delta transform(other, priority)
    // priority=false → serverOp wins on positional ties (server-wins policy)
    return serverOp.transform(clientOp, false);
  }

  /**
   * compose(base, delta)
   * Merges a delta into the current document content.
   * Used by DocumentService when persisting the new snapshot.
   */
  static compose(base: Delta, delta: Delta): Delta {
    return base.compose(delta);
  }

  /**
   * transformMultiple(incomingOp, committedOps)
   * Transforms a single incoming op against an ORDERED list of committed ops.
   * This is used during reconnect replay: a client that was offline
   * at version N reconnects at version M; we transform its pending op
   * through all ops from N+1 to M before applying.
   *
   * @param incomingOp    - Client op based on version N
   * @param committedOps  - Ops at versions N+1 … M (in order)
   * @returns             - Transformed op safe to apply at version M+1
   */
  static transformMultiple(incomingOp: Delta, committedOps: Delta[]): Delta {
    return committedOps.reduce(
      (op, committed) => OTEngine.transform(op, committed),
      incomingOp,
    );
  }

  /**
   * invert(delta, base)
   * Produces the inverse of a delta given the document state before it.
   * Used for undo/redo support.
   */
  static invert(delta: Delta, base: Delta): Delta {
    return delta.invert(base);
  }
}