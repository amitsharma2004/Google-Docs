# Collaborative Editing Implementation Guide
## Operational Transformation (OT) for Real-Time Document Editing

This guide provides a step-by-step implementation of Operational Transformation to handle concurrent editing with rich text formatting (bold, italic, underline, etc.) in a Google Docs-like application.

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Steps](#implementation-steps)
4. [Operation Types](#operation-types)
5. [Transformation Functions](#transformation-functions)
6. [WebSocket Integration](#websocket-integration)
7. [Client-Side Implementation](#client-side-implementation)
8. [Server-Side Implementation](#server-side-implementation)
9. [Testing Strategy](#testing-strategy)

---

## Overview

### What is Operational Transformation?

Operational Transformation (OT) is an algorithm that enables real-time collaborative editing by transforming operations to maintain consistency across multiple clients editing the same document simultaneously.

### Key Concepts

- **Operation**: An atomic change to the document (insert, delete, format)
- **Transform**: Adjusting operations based on concurrent changes
- **Convergence**: All clients reach the same final state
- **Causality Preservation**: Operations maintain their intended effect
- **Intention Preservation**: User's original intent is preserved

### Why OT over CRDT?

- **Better for text editing**: OT is optimized for sequential text operations
- **Smaller operation size**: Less network overhead
- **Simpler formatting**: Easier to implement rich text formatting
- **Industry proven**: Used by Google Docs, Office 365

---

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Client A   │         │   Server    │         │  Client B   │
│             │         │             │         │             │
│  Editor     │◄───────►│  OT Engine  │◄───────►│  Editor     │
│  Local OT   │ WebSocket│  Transform  │WebSocket│  Local OT   │
│  Buffer     │         │  History    │         │  Buffer     │
└─────────────┘         └─────────────┘         └─────────────┘
```

### Components

1. **Client Editor**: Rich text editor with local operation buffer
2. **WebSocket Server**: Real-time communication layer
3. **OT Engine**: Transforms and applies operations
4. **Operation History**: Maintains document version history
5. **Conflict Resolver**: Handles concurrent operations

---

## Implementation Steps

### Phase 1: Setup Foundation (Week 1)

#### Step 1.1: Install Dependencies

```bash
# Server dependencies
npm install socket.io
npm install --save-dev @types/socket.io

# Client dependencies (if using React)
npm install socket.io-client
npm install quill react-quill  # Rich text editor
```

#### Step 1.2: Define Operation Types

Create `src/types/operations.ts`:

```typescript
export enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  RETAIN = 'retain',
  FORMAT = 'format'
}

export interface BaseOperation {
  type: OperationType;
  userId: string;
  timestamp: number;
  version: number;
}

export interface InsertOperation extends BaseOperation {
  type: OperationType.INSERT;
  position: number;
  text: string;
  attributes?: TextAttributes;
}

export interface DeleteOperation extends BaseOperation {
  type: OperationType.DELETE;
  position: number;
  length: number;
}

export interface RetainOperation extends BaseOperation {
  type: OperationType.RETAIN;
  length: number;
  attributes?: TextAttributes;
}

export interface FormatOperation extends BaseOperation {
  type: OperationType.FORMAT;
  position: number;
  length: number;
  attributes: TextAttributes;
}

export interface TextAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  link?: string;
}

export type Operation = 
  | InsertOperation 
  | DeleteOperation 
  | RetainOperation 
  | FormatOperation;

export interface OperationMessage {
  documentId: string;
  operation: Operation;
  clientId: string;
  baseVersion: number;
}
```

#### Step 1.3: Create Document Version Model

Update `src/models/Document.ts` to include version tracking:

```typescript
export interface IDocument extends Document {
  // ... existing fields
  version: number;
  operations: Operation[];
  lastModified: Date;
}

const documentSchema = new Schema<IDocument>({
  // ... existing fields
  version: {
    type: Number,
    default: 0,
    required: true
  },
  operations: {
    type: [Schema.Types.Mixed],
    default: []
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});
```

---

### Phase 2: Core OT Algorithm (Week 2)

#### Step 2.1: Implement Transform Functions

Create `src/services/ot/transform.ts`:

```typescript
import { Operation, OperationType, InsertOperation, DeleteOperation } from '../../types/operations.js';

/**
 * Transform two concurrent operations
 * Returns [op1', op2'] where op1' and op2' are transformed versions
 */
export function transform(op1: Operation, op2: Operation): [Operation, Operation] {
  // Insert vs Insert
  if (op1.type === OperationType.INSERT && op2.type === OperationType.INSERT) {
    return transformInsertInsert(op1, op2);
  }
  
  // Insert vs Delete
  if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
    return transformInsertDelete(op1, op2);
  }
  
  // Delete vs Insert
  if (op1.type === OperationType.DELETE && op2.type === OperationType.INSERT) {
    const [op2Prime, op1Prime] = transformInsertDelete(op2, op1);
    return [op1Prime, op2Prime];
  }
  
  // Delete vs Delete
  if (op1.type === OperationType.DELETE && op2.type === OperationType.DELETE) {
    return transformDeleteDelete(op1, op2);
  }
  
  // Format operations
  if (op1.type === OperationType.FORMAT || op2.type === OperationType.FORMAT) {
    return transformFormat(op1, op2);
  }
  
  return [op1, op2];
}

function transformInsertInsert(
  op1: InsertOperation, 
  op2: InsertOperation
): [InsertOperation, InsertOperation] {
  const op1Prime = { ...op1 };
  const op2Prime = { ...op2 };
  
  if (op1.position < op2.position) {
    // op1 comes before op2, adjust op2's position
    op2Prime.position += op1.text.length;
  } else if (op1.position > op2.position) {
    // op2 comes before op1, adjust op1's position
    op1Prime.position += op2.text.length;
  } else {
    // Same position - use userId for tie-breaking
    if (op1.userId < op2.userId) {
      op2Prime.position += op1.text.length;
    } else {
      op1Prime.position += op2.text.length;
    }
  }
  
  return [op1Prime, op2Prime];
}

function transformInsertDelete(
  insert: InsertOperation,
  del: DeleteOperation
): [InsertOperation, DeleteOperation] {
  const insertPrime = { ...insert };
  const delPrime = { ...del };
  
  if (insert.position <= del.position) {
    // Insert before delete range
    delPrime.position += insert.text.length;
  } else if (insert.position >= del.position + del.length) {
    // Insert after delete range
    insertPrime.position -= del.length;
  } else {
    // Insert within delete range
    insertPrime.position = del.position;
    delPrime.length += insert.text.length;
  }
  
  return [insertPrime, delPrime];
}

function transformDeleteDelete(
  op1: DeleteOperation,
  op2: DeleteOperation
): [DeleteOperation, DeleteOperation] {
  const op1Prime = { ...op1 };
  const op2Prime = { ...op2 };
  
  // Calculate overlap
  const op1End = op1.position + op1.length;
  const op2End = op2.position + op2.length;
  
  if (op1End <= op2.position) {
    // op1 completely before op2
    op2Prime.position -= op1.length;
  } else if (op2End <= op1.position) {
    // op2 completely before op1
    op1Prime.position -= op2.length;
  } else {
    // Overlapping deletes
    const overlapStart = Math.max(op1.position, op2.position);
    const overlapEnd = Math.min(op1End, op2End);
    const overlapLength = overlapEnd - overlapStart;
    
    if (op1.position < op2.position) {
      op2Prime.position = op1.position;
      op2Prime.length -= overlapLength;
      op1Prime.length -= overlapLength;
    } else {
      op1Prime.position = op2.position;
      op1Prime.length -= overlapLength;
      op2Prime.length -= overlapLength;
    }
  }
  
  return [op1Prime, op2Prime];
}

function transformFormat(op1: Operation, op2: Operation): [Operation, Operation] {
  // Format operations are position-based
  // Similar logic to insert/delete but preserving attributes
  
  if (op1.type === OperationType.FORMAT && op2.type === OperationType.INSERT) {
    const op1Prime = { ...op1 };
    if (op2.position <= op1.position) {
      op1Prime.position += op2.text.length;
    }
    return [op1Prime, op2];
  }
  
  if (op1.type === OperationType.FORMAT && op2.type === OperationType.DELETE) {
    const op1Prime = { ...op1 };
    if (op2.position + op2.length <= op1.position) {
      op1Prime.position -= op2.length;
    } else if (op2.position < op1.position + op1.length) {
      // Adjust format range if delete overlaps
      const deleteEnd = op2.position + op2.length;
      const formatEnd = op1.position + op1.length;
      
      if (op2.position <= op1.position && deleteEnd >= formatEnd) {
        // Format range completely deleted
        op1Prime.length = 0;
      } else if (op2.position <= op1.position) {
        // Delete overlaps start
        op1Prime.position = op2.position;
        op1Prime.length -= (deleteEnd - op1.position);
      } else {
        // Delete within format range
        op1Prime.length -= Math.min(op2.length, formatEnd - op2.position);
      }
    }
    return [op1Prime, op2];
  }
  
  return [op1, op2];
}
```

#### Step 2.2: Implement Operation Application

Create `src/services/ot/apply.ts`:

```typescript
import { Operation, OperationType } from '../../types/operations.js';

export class DocumentState {
  private content: string;
  private formatting: Map<number, TextAttributes>;
  
  constructor(initialContent: string = '') {
    this.content = initialContent;
    this.formatting = new Map();
  }
  
  apply(operation: Operation): void {
    switch (operation.type) {
      case OperationType.INSERT:
        this.applyInsert(operation);
        break;
      case OperationType.DELETE:
        this.applyDelete(operation);
        break;
      case OperationType.FORMAT:
        this.applyFormat(operation);
        break;
    }
  }
  
  private applyInsert(op: InsertOperation): void {
    const before = this.content.substring(0, op.position);
    const after = this.content.substring(op.position);
    this.content = before + op.text + after;
    
    // Apply attributes if provided
    if (op.attributes) {
      for (let i = 0; i < op.text.length; i++) {
        this.formatting.set(op.position + i, op.attributes);
      }
    }
  }
  
  private applyDelete(op: DeleteOperation): void {
    const before = this.content.substring(0, op.position);
    const after = this.content.substring(op.position + op.length);
    this.content = before + after;
    
    // Remove formatting for deleted characters
    for (let i = 0; i < op.length; i++) {
      this.formatting.delete(op.position + i);
    }
    
    // Shift formatting indices
    const newFormatting = new Map<number, TextAttributes>();
    this.formatting.forEach((attrs, pos) => {
      if (pos >= op.position + op.length) {
        newFormatting.set(pos - op.length, attrs);
      } else if (pos < op.position) {
        newFormatting.set(pos, attrs);
      }
    });
    this.formatting = newFormatting;
  }
  
  private applyFormat(op: FormatOperation): void {
    for (let i = op.position; i < op.position + op.length; i++) {
      const existing = this.formatting.get(i) || {};
      this.formatting.set(i, { ...existing, ...op.attributes });
    }
  }
  
  getContent(): string {
    return this.content;
  }
  
  getFormatting(): Map<number, TextAttributes> {
    return new Map(this.formatting);
  }
  
  toJSON() {
    return {
      content: this.content,
      formatting: Array.from(this.formatting.entries())
    };
  }
}
```

---

### Phase 3: Server-Side Implementation (Week 3)

#### Step 3.1: Create OT Service

Create `src/services/ot/otService.ts`:

```typescript
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
  
  clearDocumentCache(documentId: string): void {
    this.documentStates.delete(documentId);
    this.operationQueues.delete(documentId);
  }
}

export const otService = new OTService();
```

#### Step 3.2: Setup WebSocket Server

Create `src/services/websocket/socketServer.ts`:

```typescript
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
        version: 0 // Get from DB
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
      
    } catch (error) {
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
```

#### Step 3.3: Update Server Entry Point

Update `server.ts`:

```typescript
import http from 'http';
import { SocketServer } from './src/services/websocket/socketServer.js';

// ... existing imports and setup

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize WebSocket server
const socketServer = new SocketServer(httpServer);

// Start server
const startServer = async () => {
  try {
    await dbConnect();
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`WebSocket server is ready`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};
```

---

### Phase 4: Client-Side Implementation (Week 4)

#### Step 4.1: Create Client OT Manager

```typescript
// client/src/services/otClient.ts
import { io, Socket } from 'socket.io-client';
import { Operation, OperationMessage } from '../types/operations';

export class OTClient {
  private socket: Socket;
  private documentId: string;
  private version: number = 0;
  private pendingOperations: Operation[] = [];
  private onRemoteOperation: (op: Operation) => void;
  
  constructor(
    documentId: string,
    token: string,
    onRemoteOperation: (op: Operation) => void
  ) {
    this.documentId = documentId;
    this.onRemoteOperation = onRemoteOperation;
    
    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3000', {
      auth: { token }
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket.emit('join-document', this.documentId);
    });
    
    this.socket.on('document-state', (data) => {
      this.version = data.version;
      // Initialize editor with content
    });
    
    this.socket.on('operation', (data) => {
      this.handleRemoteOperation(data.operation);
    });
    
    this.socket.on('operation-ack', (data) => {
      this.version = data.version;
      this.pendingOperations.shift();
    });
  }
  
  sendOperation(operation: Operation): void {
    this.pendingOperations.push(operation);
    
    const message: OperationMessage = {
      documentId: this.documentId,
      operation,
      clientId: this.socket.id,
      baseVersion: this.version
    };
    
    this.socket.emit('operation', message);
  }
  
  private handleRemoteOperation(operation: Operation): void {
    // Transform pending operations
    this.pendingOperations = this.pendingOperations.map(pending => {
      const [transformed] = transform(pending, operation);
      return transformed;
    });
    
    this.onRemoteOperation(operation);
  }
  
  disconnect(): void {
    this.socket.emit('leave-document', this.documentId);
    this.socket.disconnect();
  }
}
```

---

### Phase 5: Testing Strategy

#### Step 5.1: Unit Tests

```typescript
// tests/ot/transform.test.ts
describe('OT Transform', () => {
  test('Insert vs Insert - different positions', () => {
    const op1: InsertOperation = {
      type: OperationType.INSERT,
      position: 5,
      text: 'hello',
      userId: 'user1',
      timestamp: Date.now(),
      version: 1
    };
    
    const op2: InsertOperation = {
      type: OperationType.INSERT,
      position: 10,
      text: 'world',
      userId: 'user2',
      timestamp: Date.now(),
      version: 1
    };
    
    const [op1Prime, op2Prime] = transform(op1, op2);
    
    expect(op1Prime.position).toBe(5);
    expect(op2Prime.position).toBe(15); // Adjusted for op1's insertion
  });
  
  test('Insert vs Delete - overlapping', () => {
    // Add comprehensive test cases
  });
  
  test('Format operations', () => {
    // Test formatting transformations
  });
});
```

#### Step 5.2: Integration Tests

```typescript
// tests/integration/collaboration.test.ts
describe('Collaborative Editing', () => {
  test('Two users editing simultaneously', async () => {
    // Simulate two clients
    // Send concurrent operations
    // Verify convergence
  });
  
  test('Format preservation during edits', async () => {
    // Test that formatting is maintained
  });
});
```

---

## Operation Types Reference

### Insert Operation
```typescript
{
  type: 'insert',
  position: 10,
  text: 'Hello',
  attributes: { bold: true },
  userId: 'user123',
  timestamp: 1234567890,
  version: 5
}
```

### Delete Operation
```typescript
{
  type: 'delete',
  position: 10,
  length: 5,
  userId: 'user123',
  timestamp: 1234567890,
  version: 5
}
```

### Format Operation
```typescript
{
  type: 'format',
  position: 10,
  length: 5,
  attributes: {
    bold: true,
    italic: false,
    color: '#FF0000'
  },
  userId: 'user123',
  timestamp: 1234567890,
  version: 5
}
```

---

## Performance Optimization

### 1. Operation Compression
- Merge consecutive operations
- Compress operation history
- Implement operation snapshots

### 2. Network Optimization
- Batch operations
- Use binary protocol for large documents
- Implement delta compression

### 3. Memory Management
- Limit operation history
- Implement garbage collection
- Use efficient data structures

---

## Security Considerations

1. **Authentication**: Verify JWT tokens on WebSocket connection
2. **Authorization**: Check document permissions before applying operations
3. **Rate Limiting**: Prevent operation flooding
4. **Validation**: Sanitize operation data
5. **Audit Trail**: Log all operations for debugging

---

## Monitoring and Debugging

### Metrics to Track
- Operation latency
- Transform conflicts
- Document convergence time
- Active connections per document
- Operation queue size

### Debug Tools
- Operation visualizer
- Conflict detector
- State comparator
- Network inspector

---

## Next Steps

1. Implement basic OT with insert/delete
2. Add formatting support
3. Integrate WebSocket server
4. Build client-side editor
5. Add comprehensive testing
6. Optimize performance
7. Deploy and monitor

---

## Resources

- [OT Explained](https://operational-transformation.github.io/)
- [Google Wave OT](https://svn.apache.org/repos/asf/incubator/wave/whitepapers/operational-transform/operational-transform.html)
- [ShareJS](https://github.com/share/sharedb)
- [Quill Editor](https://quilljs.com/)

---

## Conclusion

This implementation provides a solid foundation for real-time collaborative editing with rich text formatting. The OT algorithm ensures consistency across all clients while preserving user intentions and handling concurrent edits gracefully.

Remember to:
- Test thoroughly with multiple concurrent users
- Monitor performance in production
- Iterate based on user feedback
- Keep operation history manageable
- Implement proper error handling and recovery

Good luck with your implementation!