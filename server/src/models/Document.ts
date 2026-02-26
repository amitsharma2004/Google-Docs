/**
 * Document.ts — Mongoose model for document snapshots.
 *
 * `version` is the single source of truth for OT sequencing.
 * It is incremented atomically inside DocumentService via
 * findOneAndUpdate with a version guard to prevent lost updates.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  title: string;
  /** Quill Delta JSON snapshot of full document content */
  content: object;
  /** Monotonically increasing; used as OT sequence number */
  version: number;
  createdBy: string;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, default: 'Untitled Document' },
    content: { type: Schema.Types.Mixed, required: true, default: { ops: [] } },
    version: { type: Number, required: true, default: 0 },
    createdBy: { type: String, required: true },
    collaborators: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Index for fast room lookups
DocumentSchema.index({ createdBy: 1 });
DocumentSchema.index({ collaborators: 1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);