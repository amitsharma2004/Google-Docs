import { Operation, OperationType, InsertOperation, DeleteOperation, FormatOperation, TextAttributes } from '../../types/operations.js';

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