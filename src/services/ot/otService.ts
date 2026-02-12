import { Operation } from '../../types/operations.js';
import { transform } from './transform.js';
import { DocumentState } from './apply.js';
import DocumentModel from '../../models/Document.js';
import logger from '../../utils/logger.js';

export class OTService {
  private documentStates: Map<string, DocumentState>;
  private operationQueues: Map<string, Operation[]>;
  
  constructor() {
    this.documentStates = new Map();
    this.operationQueues = new Map();
  }
  
  async loadDocument(documentId: string): Promise<DocumentState> {
    if (this.documentStates.has(documentId)) {
      return this.documentStates.get(documentId)!;
    }
    
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    
    const state = new DocumentState(doc.content);
    this.documentStates.set(documentId, state);
    this.operationQueues.set(documentId, []);
    
    return state;
  }
  
  async applyOperation(
    documentId: string,
    operation: Operation,
    baseVersion: number
  ): Promise<{ operation: Operation; version: number }> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    
    // Get operations that happened after baseVersion
    const concurrentOps = doc.operations.slice(baseVersion);
    
    // Transform the incoming operation against concurrent operations
    let transformedOp = operation;
    for (const concurrentOp of concurrentOps) {
      [transformedOp] = transform(transformedOp, concurrentOp);
    }
    
    // Apply the transformed operation
    const state = await this.loadDocument(documentId);
    state.apply(transformedOp);
    
    // Save to database
    doc.operations.push(transformedOp);
    doc.version += 1;
    doc.content = state.getContent();
    doc.lastModified = new Date();
    await doc.save();
    
    logger.info(`Applied operation to document ${documentId}, version ${doc.version}`);
    
    return {
      operation: transformedOp,
      version: doc.version
    };
  }
  
  async getDocumentState(documentId: string): Promise<DocumentState> {
    return this.loadDocument(documentId);
  }
  
  async getDocumentVersion(documentId: string): Promise<number> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    return doc.version;
  }
  
  clearDocumentCache(documentId: string): void {
    this.documentStates.delete(documentId);
    this.operationQueues.delete(documentId);
  }
}

export const otService = new OTService();