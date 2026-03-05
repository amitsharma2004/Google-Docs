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
  deleteDoc,
  shareDoc,
  getCollaborators,
  checkPermission,
  generateShareLink,
  validateShareToken,
  getShareLinks,
  deleteShareLink
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

// ── POST /api/docs/:id/share ─────────────────────────────────────────────
// Share document with a user
router.post(
  '/:id/share',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('permission').isIn(['read', 'write']).withMessage('Permission must be "read" or "write"'),
  ],
  shareDoc
);

// ── GET /api/docs/:id/collaborators ──────────────────────────────────────
// Get document collaborators
router.get('/:id/collaborators', getCollaborators);

// ── GET /api/docs/:id/permission ─────────────────────────────────────────
// Check user permission for a document
router.get('/:id/permission', checkPermission);

// ── POST /api/docs/:id/generate-link ─────────────────────────────────────
// Generate a shareable link with permission
router.post(
  '/:id/generate-link',
  [body('permission').isIn(['read', 'write']).withMessage('Permission must be "read" or "write"')],
  generateShareLink
);

// ── POST /api/docs/validate-token ────────────────────────────────────────
// Validate share link token
router.post('/validate-token', validateShareToken);

// ── GET /api/docs/:id/share-links ────────────────────────────────────────
// Get all share links for a document
router.get('/:id/share-links', getShareLinks);

// ── DELETE /api/docs/:id/share-links/:linkId ─────────────────────────────
// Delete a share link
router.delete('/:id/share-links/:linkId', deleteShareLink);

export default router;
