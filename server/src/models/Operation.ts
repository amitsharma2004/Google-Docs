/**
 * Operation.ts — Immutable op-log entry.
 *
 * Every committed op is appended here.
 * On reconnect, the server queries ops WHERE version > clientVersion
 * and replays them to the rejoining client.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IOperation extends Document {
  docId: string;
  /** Server version AFTER this op was applied */
  version: number;
  /** Quill Delta JSON */
  delta: object;
  userId: string;
  socketId: string;
  timestamp: Date;
}

const OperationSchema = new Schema<IOperation>(
  {
    docId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    delta: { type: Schema.Types.Mixed, required: true },
    userId: { type: String, required: true },
    socketId: { type: String, required: true },
  },
  { timestamps: true },
);

// Compound index for efficient replay queries
OperationSchema.index({ docId: 1, version: 1 }, { unique: true });

export default mongoose.model<IOperation>('Operation', OperationSchema);