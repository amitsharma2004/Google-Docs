/**
 * ShareLink.ts — Model for shareable document links with permissions
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IShareLink extends Document {
  documentId: mongoose.Types.ObjectId;
  token: string;
  permission: 'read' | 'write';
  createdBy: string;
  expiresAt?: Date;
  createdAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    token: { type: String, required: true, unique: true },
    permission: { type: String, enum: ['read', 'write'], required: true },
    createdBy: { type: String, required: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Index for fast token lookups
ShareLinkSchema.index({ token: 1 });
ShareLinkSchema.index({ documentId: 1 });

export default mongoose.model<IShareLink>('ShareLink', ShareLinkSchema);
