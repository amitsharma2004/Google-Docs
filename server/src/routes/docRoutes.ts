/**
 * docRoutes.ts — Document CRUD endpoints.
 * Mounted at /api/docs in app.ts
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { 
  getAllDocs, 
  createDoc, 
  getDocById, 
  updateDoc, 
  deleteDoc 
} from '../controllers/docController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── GET /api/docs ────────────────────────────────────────────────────────
// List all documents the user has access to
router.get('/', getAllDocs);

// ── POST /api/docs ───────────────────────────────────────────────────────
// Create a new document
router.post(
  '/',
  [body('title').optional().isString().withMessage('Title must be a string')],
  createDoc
);

// ── GET /api/docs/:id ────────────────────────────────────────────────────
// Get a specific document
router.get('/:id', getDocById);

// ── PUT /api/docs/:id ────────────────────────────────────────────────────
// Update document metadata (title, collaborators)
router.put(
  '/:id',
  [
    body('title').optional().isString(),
    body('collaborators').optional().isArray(),
  ],
  updateDoc
);

// ── DELETE /api/docs/:id ─────────────────────────────────────────────────
// Delete a document
router.delete('/:id', deleteDoc);

export default router;
