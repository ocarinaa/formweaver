import JSZip from 'jszip';

export const createZipArchive = async (
  pdfBuffers: Uint8Array[],
  baseFileName: string = 'document'
): Promise<Blob> => {
  const zip = new JSZip();
  
  pdfBuffers.forEach((pdfBytes, index) => {
    const fileName = `${baseFileName}_${String(index + 1).padStart(3, '0')}.pdf`;
    zip.file(fileName, pdfBytes);
  });
  
  return await zip.generateAsync({ type: 'blob' });
};

export const downloadZipFile = (zipBlob: Blob, fileName: string = 'formweaver_documents.zip') => {
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
