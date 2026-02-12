import mongoose, { Schema, Document, Types } from 'mongoose';
import { Operation } from '../types/operations.js';

export interface IAsset {
  url: string;
  type: 'image' | 'video' | 'file';
  name: string;
  size: number;
  mimeType: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface IDocument extends Document {
  title: string;
  content: string;
  owner: Types.ObjectId;
  collaborators: Array<{
    user: Types.ObjectId;
    permission: 'view' | 'edit';
  }>;
  assets: IAsset[];
  isPublic: boolean;
  lastEditedBy?: Types.ObjectId;
  version: number;
  operations: Operation[];
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: 'Untitled Document'
    },
    content: {
      type: String,
      default: ''
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Document owner is required']
    },
    collaborators: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        permission: {
          type: String,
          enum: ['view', 'edit'],
          default: 'view'
        }
      }
    ],
    assets: [
      {
        url: {
          type: String,
          required: [true, 'Asset URL is required']
        },
        type: {
          type: String,
          enum: ['image', 'video', 'file'],
          required: [true, 'Asset type is required']
        },
        name: {
          type: String,
          required: [true, 'Asset name is required'],
          trim: true
        },
        size: {
          type: Number,
          required: [true, 'Asset size is required'],
          min: 0
        },
        mimeType: {
          type: String,
          required: [true, 'Asset MIME type is required']
        },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: [true, 'Uploader is required']
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isPublic: {
      type: Boolean,
      default: false
    },
    lastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    },
    operations: {
      type: [],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ 'collaborators.user': 1 });
documentSchema.index({ isPublic: 1 });
documentSchema.index({ 'assets.type': 1 });

const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);

export default DocumentModel;