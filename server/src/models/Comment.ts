import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  document_id: mongoose.Types.ObjectId;
  start_offset: number;
  end_offset: number;
  start_path: number[];
  end_path: number[];
  selected_text: string;
  comment: string;
  author: mongoose.Types.ObjectId;
  replies: {
    author: mongoose.Types.ObjectId;
    comment: string;
    created_at: Date;
  }[];
  created_at: Date;
}

const CommentSchema = new Schema<IComment>({
  document_id: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
  start_offset: { type: Number, required: true },
  end_offset: { type: Number, required: true },
  start_path: { type: [Number], required: true },
  end_path: { type: [Number], required: true },
  selected_text: { type: String, required: true },
  comment: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  replies: [{
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model<IComment>('Comment', CommentSchema);
