/**
 * docController.ts — Document controller
 * Handles document CRUD operations
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { DocumentService } from '../services/DocumentService';
import DocumentModel from '../models/Document';
import EmailService from '../services/EmailService';
import { AuthRequest } from '../middleware/auth';

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
        { 'collaborators.userId': userId },
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
        { 'collaborators.userId': userId },
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

/**
 * Share document with a user
 * POST /api/docs/:id/share
 */
export const shareDoc = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const docId = req.params.id;
    const { email, permission } = req.body;

    if (!email || !permission) {
      res.status(400).json({ error: 'Email and permission are required' });
      return;
    }

    if (!['read', 'write'].includes(permission)) {
      res.status(400).json({ error: 'Permission must be "read" or "write"' });
      return;
    }

    // Find the document
    const doc = await DocumentModel.findOne({
      _id: docId,
      createdBy: userId, // Only creator can share
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found or access denied' });
      return;
    }

    // Find the user to share with
    const User = require('../models/User').default;
    const targetUser = await User.findOne({ email });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get the sharer's details
    const sharerUser = await User.findById(userId);

    // Check if already shared
    const existingCollaborator = doc.collaborators.find(
      (c) => c.userId === targetUser._id.toString()
    );

    if (existingCollaborator) {
      // Update permission
      existingCollaborator.permission = permission;
    } else {
      // Add new collaborator
      doc.collaborators.push({
        userId: targetUser._id.toString(),
        permission,
        addedAt: new Date(),
      });
    }

    await doc.save();

    // Send email notification (don't wait for it)
    EmailService.sendDocumentShareEmail(
      targetUser.email,
      targetUser.username || targetUser.name,
      sharerUser?.username || sharerUser?.name || 'A user',
      doc.title,
      docId,
      permission
    ).catch(err => 
      console.error('Failed to send document share email:', err)
    );

    res.json({
      message: 'Document shared successfully',
      collaborator: {
        userId: targetUser._id,
        email: targetUser.email,
        username: targetUser.username,
        permission,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to share document' });
  }
};

/**
 * Get document collaborators
 * GET /api/docs/:id/collaborators
 */
export const getCollaborators = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const docId = req.params.id;

    const doc = await DocumentModel.findOne({
      _id: docId,
      $or: [
        { createdBy: userId },
        { 'collaborators.userId': userId },
      ],
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found or access denied' });
      return;
    }

    // Get user details for all collaborators
    const User = require('../models/User').default;
    const collaboratorDetails = await Promise.all(
      doc.collaborators.map(async (collab) => {
        const user = await User.findById(collab.userId).select('username email');
        return {
          userId: collab.userId,
          username: user?.username,
          email: user?.email,
          permission: collab.permission,
          addedAt: collab.addedAt,
        };
      })
    );

    res.json({ collaborators: collaboratorDetails });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch collaborators' });
  }
};

/**
 * Check user permission for a document
 * GET /api/docs/:id/permission
 */
export const checkPermission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const docId = req.params.id;

    const doc = await DocumentModel.findById(docId);

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Creator has write permission
    if (doc.createdBy === userId) {
      res.json({ permission: 'write', isOwner: true });
      return;
    }

    // Check collaborator permission
    const collaborator = doc.collaborators.find((c) => c.userId === userId);

    if (collaborator) {
      res.json({ permission: collaborator.permission, isOwner: false });
      return;
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check permission' });
  }
};

/**
 * Generate a shareable link with permission
 * POST /api/docs/:id/generate-link
 */
export const generateShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const docId = req.params.id;
    const { permission } = req.body;

    if (!permission || !['read', 'write'].includes(permission)) {
      res.status(400).json({ error: 'Permission must be "read" or "write"' });
      return;
    }

    // Check if user owns the document
    const doc = await DocumentModel.findOne({
      _id: docId,
      createdBy: userId,
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found or access denied' });
      return;
    }

    // Generate unique token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Create share link
    const ShareLink = require('../models/ShareLink').default;
    const shareLink = await ShareLink.create({
      documentId: docId,
      token,
      permission,
      createdBy: userId,
    });

    const shareUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/docs/${docId}?token=${token}`;

    res.json({
      shareUrl,
      token,
      permission,
      expiresAt: shareLink.expiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate share link' });
  }
};

/**
 * Validate share link token and grant access
 * POST /api/docs/validate-token
 */
export const validateShareToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { token, documentId } = req.body;

    if (!token || !documentId) {
      res.status(400).json({ error: 'Token and documentId are required' });
      return;
    }

    const ShareLink = require('../models/ShareLink').default;
    const shareLink = await ShareLink.findOne({
      token,
      documentId,
    });

    if (!shareLink) {
      res.status(404).json({ error: 'Invalid or expired share link' });
      return;
    }

    // Check if link has expired
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      res.status(403).json({ error: 'Share link has expired' });
      return;
    }

    // Get the document
    const doc = await DocumentModel.findById(documentId);

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Check if user already has access
    const existingCollaborator = doc.collaborators.find(
      (c) => c.userId === userId
    );

    if (!existingCollaborator) {
      // Add user as collaborator with the link's permission
      doc.collaborators.push({
        userId,
        permission: shareLink.permission,
        addedAt: new Date(),
      });
      await doc.save();
    }

    res.json({
      message: 'Access granted',
      permission: shareLink.permission,
      document: {
        id: doc._id,
        title: doc.title,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to validate token' });
  }
};

/**
 * Get all share links for a document
 * GET /api/docs/:id/share-links
 */
export const getShareLinks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const docId = req.params.id;

    // Check if user owns the document
    const doc = await DocumentModel.findOne({
      _id: docId,
      createdBy: userId,
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found or access denied' });
      return;
    }

    const ShareLink = require('../models/ShareLink').default;
    const shareLinks = await ShareLink.find({ documentId: docId }).sort({ createdAt: -1 });

    const links = shareLinks.map((link: any) => ({
      id: link._id,
      token: link.token,
      permission: link.permission,
      shareUrl: `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/docs/${docId}?token=${link.token}`,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
    }));

    res.json({ shareLinks: links });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch share links' });
  }
};

/**
 * Delete a share link
 * DELETE /api/docs/:id/share-links/:linkId
 */
export const deleteShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id: docId, linkId } = req.params;

    // Check if user owns the document
    const doc = await DocumentModel.findOne({
      _id: docId,
      createdBy: userId,
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found or access denied' });
      return;
    }

    const ShareLink = require('../models/ShareLink').default;
    await ShareLink.findByIdAndDelete(linkId);

    res.json({ message: 'Share link deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete share link' });
  }
};
