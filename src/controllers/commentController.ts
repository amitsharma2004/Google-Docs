import { Request, Response, NextFunction } from 'express';
import Comment from '../models/Comment.js';
import DocumentModel from '../models/Document.js';
import logger from '../utils/logger.js';

// Add a new comment to a document
export const addComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;
    const { content, position, parentComment } = req.body;
    const userId = req.user?.id;

    // Validate input
    if (!content || content.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Comment content is required'
      });
    }

    // Check if document exists
    const document = await DocumentModel.findById(documentId);
    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Check if user has access to the document
    const isOwner = document.owner.toString() === userId;
    const isCollaborator = document.collaborators.some(
      (collab) => collab.user.toString() === userId
    );

    if (!isOwner && !isCollaborator && !document.isPublic) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to comment on this document'
      });
    }

    // If it's a reply, verify parent comment exists
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent comment not found'
        });
      }

      if (parent.documentId.toString() !== documentId) {
        return res.status(400).json({
          status: 'error',
          message: 'Parent comment does not belong to this document'
        });
      }
    }

    // Create comment
    const comment = await Comment.create({
      documentId,
      author: userId,
      content: content.trim(),
      position,
      parentComment: parentComment || null
    });

    // If it's a reply, add to parent's replies array
    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: comment._id }
      });
    }

    // Populate author details
    await comment.populate('author', 'name email avatar');

    logger.info(`Comment added to document ${documentId} by user ${userId}`);

    res.status(201).json({
      status: 'success',
      message: 'Comment added successfully',
      data: {
        comment
      }
    });
  } catch (error) {
    logger.error('Add comment error:', error);
    next(error);
  }
};

// Remove a comment
export const removeComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    // Check if document exists
    const document = await DocumentModel.findById(comment.documentId);
    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Check permissions: only comment author or document owner can delete
    const isCommentAuthor = comment.author.toString() === userId;
    const isDocumentOwner = document.owner.toString() === userId;

    if (!isCommentAuthor && !isDocumentOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this comment'
      });
    }

    // If comment has replies, remove them as well
    if (comment.replies && comment.replies.length > 0) {
      await Comment.deleteMany({ _id: { $in: comment.replies } });
    }

    // If it's a reply, remove from parent's replies array
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id }
      });
    }

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    logger.info(`Comment ${commentId} deleted by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Remove comment error:', error);
    next(error);
  }
};

// Get all comments for a document
export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;
    const userId = req.user?.id;
    const { includeResolved = 'true', page = '1', limit = '50' } = req.query;

    // Check if document exists
    const document = await DocumentModel.findById(documentId);
    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Check if user has access to the document
    const isOwner = document.owner.toString() === userId;
    const isCollaborator = document.collaborators.some(
      (collab) => collab.user.toString() === userId
    );

    if (!isOwner && !isCollaborator && !document.isPublic) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view comments on this document'
      });
    }

    // Build query
    const query: any = {
      documentId,
      parentComment: null // Only get top-level comments
    };

    // Filter by resolved status if specified
    if (includeResolved === 'false') {
      query.isResolved = false;
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get comments with populated fields
    const comments = await Comment.find(query)
      .populate('author', 'name email avatar')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'name email avatar'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Comment.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        comments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Get comments error:', error);
    next(error);
  }
};

// Resolve/unresolve a comment
export const toggleResolveComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    // Check if document exists
    const document = await DocumentModel.findById(comment.documentId);
    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Check permissions: comment author, document owner, or collaborators with edit permission
    const isCommentAuthor = comment.author.toString() === userId;
    const isDocumentOwner = document.owner.toString() === userId;
    const hasEditPermission = document.collaborators.some(
      (collab) => collab.user.toString() === userId && collab.permission === 'edit'
    );

    if (!isCommentAuthor && !isDocumentOwner && !hasEditPermission) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to resolve this comment'
      });
    }

    // Toggle resolved status
    comment.isResolved = !comment.isResolved;
    await comment.save();

    logger.info(`Comment ${commentId} ${comment.isResolved ? 'resolved' : 'unresolved'} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: `Comment ${comment.isResolved ? 'resolved' : 'unresolved'} successfully`,
      data: {
        comment
      }
    });
  } catch (error) {
    logger.error('Toggle resolve comment error:', error);
    next(error);
  }
};

// Update a comment
export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    // Validate input
    if (!content || content.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Comment content is required'
      });
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    // Check permissions: only comment author can edit
    if (comment.author.toString() !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only edit your own comments'
      });
    }

    // Update comment
    comment.content = content.trim();
    await comment.save();
    await comment.populate('author', 'name email avatar');

    logger.info(`Comment ${commentId} updated by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Comment updated successfully',
      data: {
        comment
      }
    });
  } catch (error) {
    logger.error('Update comment error:', error);
    next(error);
  }
};