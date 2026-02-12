import { Operation, OperationType, InsertOperation, DeleteOperation, FormatOperation } from '../../types/operations.js';

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
    const op1Prime = { ...op1 } as FormatOperation;
    const op2Prime = { ...op2 };
    if (op2.position <= op1.position) {
      op1Prime.position += op2.text.length;
    }
    return [op1Prime, op2Prime];
  }
  
  if (op1.type === OperationType.FORMAT && op2.type === OperationType.DELETE) {
    const op1Prime = { ...op1 } as FormatOperation;
    const op2Prime = { ...op2 };
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
    return [op1Prime, op2Prime];
  }
  
  return [op1, op2];
}