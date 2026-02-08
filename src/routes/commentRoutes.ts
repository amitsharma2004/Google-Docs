import express from 'express';
import {
  addComment,
  removeComment,
  getComments,
  toggleResolveComment,
  updateComment
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Comment routes
router.post('/documents/:documentId/comments', addComment);
router.get('/documents/:documentId/comments', getComments);
router.patch('/comments/:commentId', updateComment);
router.delete('/comments/:commentId', removeComment);
router.patch('/comments/:commentId/resolve', toggleResolveComment);

export default router;