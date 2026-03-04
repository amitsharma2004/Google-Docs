import express from 'express';
import { createComment, getDocumentComments, addReply, deleteComment } from '../controllers/commentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, createComment);
router.get('/document/:documentId', authenticate, getDocumentComments);
router.post('/:commentId/reply', authenticate, addReply);
router.delete('/:commentId', authenticate, deleteComment);

export default router;
