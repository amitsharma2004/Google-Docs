/**
 * Document.ts — Mongoose model for document snapshots.
 *
 * `version` is the single source of truth for OT sequencing.
 * It is incremented atomically inside DocumentService via
 * findOneAndUpdate with a version guard to prevent lost updates.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ICollaborator {
  userId: string;
  permission: 'read' | 'write';
  addedAt: Date;
}

export interface IDocument extends Document {
  title: string;
  /** Quill Delta JSON snapshot of full document content */
  content: object;
  /** Monotonically increasing; used as OT sequence number */
  version: number;
  createdBy: string;
  collaborators: ICollaborator[];
  createdAt: Date;
  updatedAt: Date;
}

const CollaboratorSchema = new Schema<ICollaborator>({
  userId: { type: String, required: true },
  permission: { type: String, enum: ['read', 'write'], required: true, default: 'write' },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const DocumentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, default: 'Untitled Document' },
    content: { type: Schema.Types.Mixed, required: true, default: { ops: [] } },
    version: { type: Number, required: true, default: 0 },
    createdBy: { type: String, required: true },
    collaborators: { type: [CollaboratorSchema], default: [] },
  },
  { timestamps: true },
);

// Index for fast room lookups
DocumentSchema.index({ createdBy: 1 });
DocumentSchema.index({ 'collaborators.userId': 1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);