'use client';

import { useState } from 'react';
import Step1Upload from '../components/steps/Step1Upload';
import Step2Editor from '../components/steps/Step2Editor';
import Step3Generate from '../components/steps/Step3Generate';
import { parseExcelFile } from '../lib/excel-parser';
import { ExcelData, PDFField } from '../types';

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [fields, setFields] = useState<PDFField[]>([]);
  const [previewSizes, setPreviewSizes] = useState<{ [pageIndex: number]: { width: number, height: number }}>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFilesUploaded = async (excel: File, pdf: File, sheet: string) => {
    setIsLoading(true);
    try {
      const data = await parseExcelFile(excel, sheet); 
      setPdfFile(pdf);
      setExcelData(data);
      setCurrentStep(2);
    } catch (err: any) {
      console.error("File upload error:", err);
    } 
    finally { setIsLoading(false); }
  };

  const handleFieldsConfigured = (configuredFields: PDFField[], sizes: { [pageIndex: number]: { width: number, height: number }}) => {
    setFields(configuredFields);
    setPreviewSizes(sizes);
    setCurrentStep(3);
  };

  const handleBackToUpload = () => setCurrentStep(1);
  const handleBackToEditor = () => setCurrentStep(2);
  const handleReset = () => {
    console.log('🔄 System resetting - Full cleanup starting...');
    
    // Clear states
    setCurrentStep(1);
    setPdfFile(null);
    setExcelData(null);
    setFields([]);
    setPreviewSizes({});
    setIsLoading(false);
    
    // Memory cleanup to trigger browser garbage collection
    if (typeof window !== 'undefined') {
      // Local storage cleanup (if any)
      try {
        localStorage.removeItem('formweaver_temp');
        sessionStorage.clear();
      } catch (e) {
        console.log('Storage cleanup error:', e);
      }
      
      // Force garbage collection (development only)
      if (process.env.NODE_ENV === 'development' && (window as any).gc) {
        setTimeout(() => {
          (window as any).gc();
          console.log('🧹 Memory garbage collection triggered');
        }, 100);
      }
    }
    
    console.log('✅ System completely reset - Ready for new project');
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Processing your files...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {currentStep === 1 && <Step1Upload onFilesUploaded={handleFilesUploaded} />}
      {currentStep === 2 && excelData && pdfFile && <Step2Editor excelData={excelData} pdfFile={pdfFile} onFieldsConfigured={handleFieldsConfigured} onBack={handleBackToUpload} />}
      {currentStep === 3 && excelData && pdfFile && <Step3Generate excelData={excelData} pdfFile={pdfFile} fields={fields} previewSizes={previewSizes} onReset={handleReset} />}
    </div>
  );
}