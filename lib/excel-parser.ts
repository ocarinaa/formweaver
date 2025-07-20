// lib/excel-parser.ts
import * as XLSX from 'xlsx';
import { ExcelData } from '../types';

export const getSheetNames = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook.SheetNames);
      } catch (error) {
        reject(new Error('Failed to read sheet names from Excel file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const parseExcelFile = async (file: File, sheetName: string): Promise<ExcelData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error(`Sheet "${sheetName}" not found in the Excel file.`);
        }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length === 0) throw new Error('Selected Excel sheet is empty.');
        
        const headers = (jsonData[0] as string[]).filter(h => h);
        const rows = (jsonData.slice(1) as any[][]).map(row => {
          const rowObj: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowObj[header] = row[index] || '';
          });
          return rowObj;
        }).filter(row => Object.values(row).some(val => val !== ''));
        
        resolve({ 
          headers, 
          columns: headers, // columns property'sini ekle
          rows 
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse Excel file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const validateExcelFile = (file: File): string | null => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (!validTypes.includes(file.type)) {
    return 'Please select a valid Excel file (.xlsx or .xls)';
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return 'File size must be less than 10MB';
  }
  
  return null;
};
