/**
 * docController.ts — Document controller
 * Handles document CRUD operations
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { DocumentService } from '../services/DocumentService';
import DocumentModel from '../models/Document';

/**
 * Get all documents for the authenticated user
 * GET /api/docs
 */
export const getAllDocs = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch documents' });
  }
};

/**
 * Create a new document
 * POST /api/docs
 */
export const createDoc = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create document' });
  }
};

/**
 * Get a specific document by ID
 * GET /api/docs/:id
 */
export const getDocById = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch document' });
  }
};

/**
 * Update document metadata (title, collaborators)
 * PUT /api/docs/:id
 */
export const updateDoc = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update document' });
  }
};

/**
 * Delete a document
 * DELETE /api/docs/:id
 */
export const deleteDoc = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete document' });
  }
};
