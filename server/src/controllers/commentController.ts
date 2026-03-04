import { Request, Response } from 'express';
import Comment from '../models/Comment';
import { AuthRequest } from '../middleware/auth';

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { document_id, start_offset, end_offset, start_path, end_path, selected_text, comment } = req.body;
    
    const newComment = new Comment({
      document_id,
      start_offset,
      end_offset,
      start_path,
      end_path,
      selected_text,
      comment,
      author: req.user?.userId,
      replies: []
    });

    await newComment.save();
    await newComment.populate('author', 'username email');
    
    // Emit socket event to notify other users
    const io = req.app.locals.io;
    if (io) {
      io.to(`doc:${document_id}`).emit('comment-added', newComment);
    }
    
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating comment', error });
  }
};

export const getDocumentComments = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    
    const comments = await Comment.find({ document_id: documentId })
      .populate('author', 'username email')
      .populate('replies.author', 'username email')
      .sort({ created_at: -1 });
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error });
  }
};

export const addReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { comment } = req.body;
    
    const commentDoc = await Comment.findById(commentId);
    if (!commentDoc) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    commentDoc.replies.push({
      author: req.user?.userId,
      comment,
      created_at: new Date()
    } as any);

    await commentDoc.save();
    await commentDoc.populate('replies.author', 'username email');
    
    // Emit socket event to notify other users
    const io = req.app.locals.io;
    if (io) {
      io.to(`doc:${commentDoc.document_id}`).emit('comment-reply-added', commentDoc);
    }
    
    res.json(commentDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error adding reply', error });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user?.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const documentId = comment.document_id;
    await Comment.findByIdAndDelete(commentId);
    
    // Emit socket event to notify other users
    const io = req.app.locals.io;
    if (io) {
      io.to(`doc:${documentId}`).emit('comment-deleted', { commentId });
    }
    
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comment', error });
  }
};
