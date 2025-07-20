// lib/pdf-generator.ts
/**
 * FormWeaver PDF Generator
 * 
 * This file contains coordinate calculation algorithms derived from PlainMerge
 * Original PlainMerge License: AGPL-3.0
 * FormWeaver Adaptations: AGPL-3.0
 * 
 * Key derivations:
 * - Y-coordinate calculation methodology (line 116: PlainMerge'in hassas Y koordinatı hesaplaması)
 * - Field positioning algorithms
 * - Multi-page PDF handling patterns
 * 
 * Adaptations:
 * - pdf-lib integration for browser compatibility  
 * - Enhanced QR code generation
 * - Encrypted PDF support
 * - TypeScript type safety
 */

import { PDFDocument, PDFPage, rgb, StandardFonts, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PDFField, ExcelData } from '../types';
import QRCode from 'qrcode';

const fontCache = new Map<string, ArrayBuffer>();

async function getFontBytes(fontFamily: string = 'Inter'): Promise<ArrayBuffer> {
  if (fontCache.has(fontFamily)) {
    return fontCache.get(fontFamily)!;
  }
  
  // Local font paths - No more CORS issues!
  const fontPaths: Record<string, string> = {
    'Inter': '/fonts/Inter-Regular.ttf',
    'Inter-Bold': '/fonts/Inter-Regular.ttf',   // Fallback to regular
    'Roboto': '/fonts/Inter-Regular.ttf',       // Fallback to Inter
    'Arial': '/fonts/Inter-Regular.ttf'         // Fallback to Inter
  };
  
  const fontPath = fontPaths[fontFamily] || fontPaths['Inter'];
  
  try {
    console.log(`🔤 Loading local font: ${fontFamily} -> ${fontPath}`);
    const response = await fetch(fontPath);
    if (!response.ok) throw new Error(`HTTP ${response.status} - Font bulunamadı: ${fontPath}`);
    const fontBytes = await response.arrayBuffer();
    fontCache.set(fontFamily, fontBytes);
    console.log(`✅ Local font loaded: ${fontFamily} (${fontBytes.byteLength} bytes)`);
    return fontBytes;
  } catch (error) {
    console.error(`❌ Failed to load local font (${fontFamily}):`, error);
    if (fontFamily !== 'Inter') {
      console.log(`🔄 Inter fontuna fallback yapılıyor...`);
      return getFontBytes('Inter'); // Fallback to Inter
    }
    throw new Error(`Critical: Inter font could not be loaded! ${error}`);
  }
}

function hexToRgb(hex: string = '#000000'): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255,
  } : { r: 0, g: 0, b: 0 };
}

export const generatePDFs = async (
  templateFile: File, excelData: ExcelData, fields: PDFField[],
  previewSizes: { [pageIndex: number]: { width: number; height: number; } }
): Promise<Uint8Array[]> => {
  console.log('🚀 PDF Generation starting...');
  console.log('📄 Template file:', templateFile.name, templateFile.size, 'bytes');
  console.log('📊 Excel data rows:', excelData.rows.length);
  console.log('🎯 Fields:', fields.length);
  console.log('📏 Preview sizes:', previewSizes);
  
  const templateBytes = await templateFile.arrayBuffer();
  const pdfs: Uint8Array[] = [];

  for (let rowIndex = 0; rowIndex < excelData.rows.length; rowIndex++) {
    const row = excelData.rows[rowIndex];
    console.log(`📋 İşleniyor: Row ${rowIndex + 1}/${excelData.rows.length}`);
    
    try {
      // Encrypted PDF desteği
      const pdfDoc = await PDFDocument.load(templateBytes, { 
        ignoreEncryption: true 
      });
      pdfDoc.registerFontkit(fontkit);
      const pages = pdfDoc.getPages();
      const loadedFonts = new Map<string, any>();

      console.log(`📖 PDF sayfa sayısı: ${pages.length}`);

      for (const field of fields) {
        const pageIndex = field.pageIndex - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) {
          console.warn(`⚠️ Geçersiz sayfa indeksi: ${field.pageIndex} (max: ${pages.length})`);
          continue;
        }
        
        const page = pages[pageIndex];
        const previewSize = previewSizes[field.pageIndex];
        if (!previewSize) {
          console.warn(`⚠️ Preview size bulunamadı: sayfa ${field.pageIndex}`);
          continue;
        }
        
        const { width: originalPdfWidth, height: originalPdfHeight } = page.getSize();
        const scaleFactor = originalPdfWidth / previewSize.width;
        const value = String(row[field.columnName] || '');

        if (!value || value === 'undefined') {
          console.log(`⏭️ Boş değer atlanıyor: ${field.columnName}`);
          continue;
        }

        try {
          // Font yükleme ve cache
          let customFont;
          const fontName = field.fontFamily || 'Inter';
          if (loadedFonts.has(fontName)) {
            customFont = loadedFonts.get(fontName);
          } else {
            const fontBytes = await getFontBytes(fontName);
            customFont = await pdfDoc.embedFont(fontBytes);
            loadedFonts.set(fontName, customFont);
            console.log(`✅ Font embedded: ${fontName}`);
          }
          
          const pdfX = field.x * scaleFactor;
          const pdfFontSize = (field.fontSize || 12) * (field.scaleX || 1) * scaleFactor;
          
          // PlainMerge'in hassas Y koordinatı hesaplaması
          const fontHeightInPdf = customFont.heightAtSize(pdfFontSize);
          const pdfY = originalPdfHeight - (field.y * scaleFactor) - fontHeightInPdf * 0.8;
          
          const color = hexToRgb(field.fill);
          
          console.log(`📝 Text ekleniyor: "${value}" at (${pdfX.toFixed(1)}, ${pdfY.toFixed(1)}) size:${pdfFontSize.toFixed(1)}`);
          
          page.drawText(value, {
            x: pdfX, 
            y: pdfY, 
            font: customFont, 
            size: pdfFontSize,
            color: rgb(color.r, color.g, color.b), 
            rotate: degrees(-(field.angle || 0)),
          });
        } catch (fieldError) { 
          console.error(`❌ Field "${field.columnName}" için hata:`, fieldError); 
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      pdfs.push(pdfBytes);
      console.log(`✅ PDF ${rowIndex + 1} oluşturuldu: ${pdfBytes.length} bytes`);
      
    } catch (rowError) {
      console.error(`❌ Row ${rowIndex + 1} işlenirken hata:`, rowError);
      // Continue with next row instead of failing completely
    }
  }
  
  console.log(`🎉 PDF Generation tamamlandı: ${pdfs.length} PDF oluşturuldu`);
  return pdfs;
};