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