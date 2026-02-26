/**
 * docRoutes.ts — Document CRUD endpoints.
 * Mounted at /api/docs in app.ts
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { DocumentService } from '../services/DocumentService';
import DocumentModel from '../models/Document';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── GET /api/docs ────────────────────────────────────────────────────────
// List all documents the user has access to
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    
    const docs = await DocumentModel.find({
      $or: [
        { createdBy: userId },
        { collaborators: userId },
      ],
    })
      .select('_id title createdBy createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ documents: docs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/docs ───────────────────────────────────────────────────────
// Create a new document
router.post(
  '/',
  [body('title').optional().isString().withMessage('Title must be a string')],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const userId = req.user!.userId;
      const title = req.body.title || 'Untitled Document';

      const doc = await DocumentService.createDocument(title, userId);

      res.status(201).json({
        document: {
          id: doc._id,
          title: doc.title,
          createdBy: doc.createdBy,
          createdAt: doc.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ── GET /api/docs/:id ────────────────────────────────────────────────────
// Get a specific document
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const docId = req.params.id;

    const doc = await DocumentModel.findOne({
      _id: docId,
      $or: [
        { createdBy: userId },
        { collaborators: userId },
      ],
    }).lean();

    if (!doc) {
      res.status(404).json({ error: 'Document not found or access denied' });
      return;
    }

    res.json({ document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/docs/:id ────────────────────────────────────────────────────
// Update document metadata (title, collaborators)
router.put(
  '/:id',
  [
    body('title').optional().isString(),
    body('collaborators').optional().isArray(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const userId = req.user!.userId;
      const docId = req.params.id;

      const doc = await DocumentModel.findOne({
        _id: docId,
        createdBy: userId, // Only creator can update metadata
      });

      if (!doc) {
        res.status(404).json({ error: 'Document not found or access denied' });
        return;
      }

      if (req.body.title !== undefined) {
        doc.title = req.body.title;
      }

      if (req.body.collaborators !== undefined) {
        doc.collaborators = req.body.collaborators;
      }

      await doc.save();

      res.json({ document: doc });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ── DELETE /api/docs/:id ─────────────────────────────────────────────────
// Delete a document
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const docId = req.params.id;

    const doc = await DocumentModel.findOneAndDelete({
      _id: docId,
      createdBy: userId, // Only creator can delete
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found or access denied' });
      return;
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
