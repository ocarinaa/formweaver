'use client';

import { useState } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { getSheetNames } from '../../lib/excel-parser';
// validateExcelFile ve validatePDFFile fonksiyonlarının lib dosyalarında export edildiğini varsayıyoruz

interface Step1UploadProps {
  onFilesUploaded: (excelFile: File, pdfFile: File, selectedSheet: string) => void;
}

export default function Step1Upload({ onFilesUploaded }: Step1UploadProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleExcelUpload = async (file: File) => {
    try {
      setError(null);
      setExcelFile(file);
      const sheets = await getSheetNames(file);
      setSheetNames(sheets);
      setSelectedSheet(sheets[0] || '');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">FormWeaver</h1>
          <p className="text-xl text-slate-300">Step 1: Upload Your Files</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <input type="file" accept=".xlsx,.xls" onChange={(e) => { if(e.target.files?.[0]) handleExcelUpload(e.target.files[0]); }} className="hidden" id="excel-upload" />
            <label htmlFor="excel-upload" className="cursor-pointer flex items-center gap-4 w-full">
              <TableCellsIcon className={`w-10 h-10 shrink-0 transition-colors ${excelFile ? 'text-teal-500' : 'text-slate-400'}`} />
              <div className="text-left overflow-hidden">
                <p className="text-white font-semibold">Excel Data File</p>
                <p className="text-slate-400 text-sm truncate" title={excelFile?.name}>{excelFile ? excelFile.name : 'Click to select'}</p>
              </div>
            </label>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <input type="file" accept=".pdf" onChange={(e) => { if(e.target.files?.[0]) setPdfFile(e.target.files[0]); }} className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className="cursor-pointer flex items-center gap-4 w-full">
              <DocumentTextIcon className={`w-10 h-10 shrink-0 transition-colors ${pdfFile ? 'text-teal-500' : 'text-slate-400'}`} />
              <div className="text-left overflow-hidden">
                <p className="text-white font-semibold">PDF Template</p>
                <p className="text-slate-400 text-sm truncate" title={pdfFile?.name}>{pdfFile ? pdfFile.name : 'Click to select'}</p>
              </div>
            </label>
          </div>
        </div>
        
        {sheetNames.length > 1 && (
          <div className="mb-8 max-w-sm mx-auto">
            <label htmlFor="sheet-select" className="block text-sm font-medium text-slate-300 mb-2 text-center">Which Excel sheet would you like to use?</label>
            <select id="sheet-select" value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)} className="w-full bg-slate-700 text-white p-3 rounded border border-slate-600 focus:ring-teal-500 focus:border-teal-500">
              {sheetNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        )}
        
        {error && <p className="text-red-400 text-center mb-4">{error}</p>}

        <div className="text-center">
          <button onClick={() => { if(excelFile && pdfFile && selectedSheet) onFilesUploaded(excelFile, pdfFile, selectedSheet); }} disabled={!excelFile || !pdfFile || !selectedSheet} className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}