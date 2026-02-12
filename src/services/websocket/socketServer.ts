import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { otService } from '../ot/otService.js';
import { OperationMessage } from '../../types/operations.js';
import logger from '../../utils/logger.js';
import jwt from 'jsonwebtoken';

export class SocketServer {
  private io: Server;
  private documentRooms: Map<string, Set<string>>;
  
  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      }
    });
    
    this.documentRooms = new Map();
    this.setupMiddleware();
    this.setupEventHandlers();
  }
  
  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }
  
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Join document room
      socket.on('join-document', async (documentId: string) => {
        await this.handleJoinDocument(socket, documentId);
      });
      
      // Handle operations
      socket.on('operation', async (message: OperationMessage) => {
        await this.handleOperation(socket, message);
      });
      
      // Handle cursor position
      socket.on('cursor-position', (data: any) => {
        this.handleCursorPosition(socket, data);
      });
      
      // Leave document
      socket.on('leave-document', (documentId: string) => {
        this.handleLeaveDocument(socket, documentId);
      });
      
      // Disconnect
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.handleDisconnect(socket);
      });
    });
  }
  
  private async handleJoinDocument(socket: Socket, documentId: string): Promise<void> {
    try {
      // Load document state
      const state = await otService.getDocumentState(documentId);
      const version = await otService.getDocumentVersion(documentId);
      
      // Join room
      socket.join(`document:${documentId}`);
      
      // Track user in room
      if (!this.documentRooms.has(documentId)) {
        this.documentRooms.set(documentId, new Set());
      }
      this.documentRooms.get(documentId)!.add(socket.id);
      
      // Send current document state
      socket.emit('document-state', {
        documentId,
        content: state.getContent(),
        formatting: Array.from(state.getFormatting().entries()),
        version
      });
      
      // Notify others
      socket.to(`document:${documentId}`).emit('user-joined', {
        userId: socket.data.user.id,
        socketId: socket.id
      });
      
      logger.info(`User ${socket.data.user.id} joined document ${documentId}`);
    } catch (error) {
      logger.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  }
  
  private async handleOperation(socket: Socket, message: OperationMessage): Promise<void> {
    try {
      const { documentId, operation, baseVersion } = message;
      
      // Apply operation with OT
      const result = await otService.applyOperation(documentId, operation, baseVersion);
      
      // Broadcast to all clients in the room except sender
      socket.to(`document:${documentId}`).emit('operation', {
        operation: result.operation,
        version: result.version,
        userId: socket.data.user.id
      });
      
      // Acknowledge to sender
      socket.emit('operation-ack', {
        version: result.version,
        operationId: operation.timestamp
      });
      
    } catch (error: any) {
      logger.error('Error handling operation:', error);
      socket.emit('operation-error', {
        message: 'Failed to apply operation',
        error: error.message
      });
    }
  }
  
  private handleCursorPosition(socket: Socket, data: any): void {
    const { documentId, position, selection } = data;
    
    socket.to(`document:${documentId}`).emit('cursor-update', {
      userId: socket.data.user.id,
      position,
      selection
    });
  }
  
  private handleLeaveDocument(socket: Socket, documentId: string): void {
    socket.leave(`document:${documentId}`);
    
    const room = this.documentRooms.get(documentId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        this.documentRooms.delete(documentId);
        otService.clearDocumentCache(documentId);
      }
    }
    
    socket.to(`document:${documentId}`).emit('user-left', {
      userId: socket.data.user.id
    });
  }
  
  private handleDisconnect(socket: Socket): void {
    // Clean up all rooms
    this.documentRooms.forEach((users, documentId) => {
      if (users.has(socket.id)) {
        this.handleLeaveDocument(socket, documentId);
      }
    });
  }
}