import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment extends Document {
  documentId: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  position?: {
    start: number;
    end: number;
  };
  isResolved: boolean;
  parentComment?: Types.ObjectId;
  replies: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document ID is required']
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required']
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    position: {
      start: {
        type: Number,
        min: 0
      },
      end: {
        type: Number,
        min: 0
      }
    },
    isResolved: {
      type: Boolean,
      default: false
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    replies: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
commentSchema.index({ documentId: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ isResolved: 1 });

const Comment = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;