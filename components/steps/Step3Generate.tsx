// components/steps/Step3Generate.tsx
'use client';

import { useState } from 'react';
import { 
  DocumentArrowDownIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { ExcelData, PDFField } from '../../types';
import { generatePDFs } from '../../lib/pdf-generator';
import { createZipArchive, downloadZipFile } from '../../lib/zip-archiver';

interface Step3GenerateProps {
  excelData: ExcelData;
  pdfFile: File;
  fields: PDFField[];
  previewSizes: { [pageIndex: number]: { width: number; height: number; } }; // New prop
  onReset: () => void;
}

export default function Step3Generate({ 
  excelData, 
  pdfFile, 
  fields, 
  previewSizes, // New prop
  onReset 
}: Step3GenerateProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(20);
      // Send previewSizes to generatePDFs function as well
      const pdfBuffers = await generatePDFs(pdfFile, excelData, fields, previewSizes);
      
      setProgress(80);
      
      const zipBlob = await createZipArchive(pdfBuffers, 'FormWeaver_Documents');
      
      setProgress(100);
      
      downloadZipFile(zipBlob);
      
      setIsComplete(true);
      
      // 10 second cooldown - to prevent rapid operations
      console.log('🎉 PDF Generation completed: ', excelData.rows.length, 'PDFs created');
      setCooldownSeconds(10);
      
      const countdown = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isComplete) {
    return (
      <div className="step-container">
        <div className="max-w-2xl w-full text-center">
          <CheckCircleIcon className="w-16 h-16 text-teal-500 mx-auto mb-6" /> {/* Icon size reduced */}
          <h2 className="text-3xl font-bold text-white mb-4">
            Generation Complete!
          </h2>
          <p className="text-slate-300 mb-8">
            {excelData.rows.length} PDF documents have been created and downloaded as a ZIP file.
          </p>
          
          <div className="bg-slate-800 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-teal-500">{excelData.rows.length}</p>
                <p className="text-slate-400 text-sm">Documents Created</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-500">{fields.length}</p>
                <p className="text-slate-400 text-sm">Fields Mapped</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={onReset}
              disabled={cooldownSeconds > 0}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                cooldownSeconds > 0 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {cooldownSeconds > 0 
                ? `New Project (in ${cooldownSeconds}s)` 
                : 'Start New Project'
              }
            </button>
            {cooldownSeconds > 0 && (
              <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-200 text-sm text-center">
                  ⏱️ A short waiting period is applied for system stabilization...
                </p>
              </div>
            )}
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-amber-200 text-sm text-center">
                <strong>🔒 Security Note:</strong> PDF template has been cleared for security purposes. 
                You need to start a new project to create new documents.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-container">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Step 3: Generate and Download
          </h2>
          <p className="text-slate-300">
            Review your configuration and generate PDF documents
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-8 mb-8">
          <h3 className="text-xl font-semibold text-white mb-6">
            Generation Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-500 mb-2">
                {excelData.rows.length}
              </p>
              <p className="text-slate-300 text-sm">
                Data Rows Found
              </p>
              <p className="text-slate-400 text-xs">
                Individual PDFs will be created
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-500 mb-2">
                {fields.length}
              </p>
              <p className="text-slate-300 text-sm">
                Fields Mapped
              </p>
              <p className="text-slate-400 text-xs">
                {fields.filter(f => f.isQRCode).length} QR codes
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-500 mb-2">
                1
              </p>
              <p className="text-slate-300 text-sm">
                ZIP file
              </p>
              <p className="text-slate-400 text-xs">
                All PDFs will be packaged
              </p>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <h4 className="text-lg font-medium text-white mb-4">
              Mapped Fields:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center space-x-3 bg-slate-700 p-3 rounded-lg"
                >
                  <span className="text-slate-400 text-sm">
                    {index + 1}.
                  </span>
                  <span className="text-white font-medium">
                    {field.columnName}
                  </span>
                  {field.isQRCode && (
                    <span className="bg-teal-500 text-white text-xs px-2 py-1 rounded">
                      QR Code
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-8">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-300 font-medium">Generation Failed!</p>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300">Generating PDFs...</span>
              <span className="text-slate-300">{progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary w-full py-4 text-lg font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center space-x-3"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Generating PDFs...</span>
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-5 h-5" />
                <span>Download All as ZIP</span>
              </>
            )}
          </button>

          <button
            onClick={onReset}
            disabled={isGenerating}
            className="bg-teal-600 text-white w-full py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            Start New Project
          </button>
        </div>

        <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-center space-y-2">
            <p className="text-slate-400 text-sm">
              🔒 <strong>100% Secure:</strong> All operations are performed in your browser. 
              Your files never leave your computer.
            </p>
            <p className="text-amber-300 text-xs">
              ⚡ <strong>Single Session:</strong> PDF template is automatically cleared after processing for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}