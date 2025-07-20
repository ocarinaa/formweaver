// types/index.ts
export interface ExcelData {
  headers: string[];
  columns: string[];
  rows: Record<string, any>[];
}

export interface PDFField {
  id: string;
  columnName: string;
  isQRCode: boolean;
  pageIndex: number; // Specifies which page the field is on (starting from 1)
  // Position and Size (as received from fabric.js)
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  // Stil
  fontSize: number;
  fill?: string;
  color?: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration?: string;
}