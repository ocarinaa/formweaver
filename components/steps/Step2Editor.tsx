/**
 * FormWeaver Step2Editor Component
 * 
 * This file contains code derived from PlainMerge (https://github.com/plainmerge/plainmerge)
 * Original PlainMerge License: AGPL-3.0
 * FormWeaver Adaptations: AGPL-3.0
 * 
 * Key derivations from PlainMerge:
 * - Canvas state management methodology (line 30: PLAINMERGE YÖNTEMİ)
 * - Fabric.js integration patterns
 * - Multi-page PDF handling approach
 * - Field serialization and restoration
 * 
 * Adaptations for web environment:
 * - Next.js/React hooks instead of Electron
 * - Dynamic PDF.js loading for browser compatibility
 * - Enhanced error handling and stability
 * - Modern TypeScript patterns
 */

'use client';

import React, { useRef, useEffect, useState, DragEventHandler } from 'react';
import { ExcelData, PDFField } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon, ExclamationTriangleIcon, QrCodeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

let fabric: any = null;
let pdfjsLib: any = null;

const SUPPORTED_FONTS = [{ name: 'Inter' }, { name: 'Roboto' }, { name: 'Arial' }];

interface Step2EditorProps {
    pdfFile: File;
    excelData: ExcelData;
    onFieldsConfigured: (fields: PDFField[], previewSizes: { [pageIndex: number]: { width: number, height: number }}) => void;
    onBack: () => void;
}

export default function Step2Editor({ pdfFile, excelData, onFieldsConfigured, onBack }: Step2EditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<any>(null);
    const [pdfPagesAsImages, setPdfPagesAsImages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedObject, setSelectedObject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfDocument, setPdfDocument] = useState<any>(null);
    
    // SAYFAYA ÖZEL ALANLARI SAKLAMA - PLAINMERGE YÖNTEMİ
    const [canvasStates, setCanvasStates] = useState<{ [pageIndex: number]: any }>({});

    // 1. Gerekli kütüphaneleri yükle ve PDF'i resimlere çevir - ENHANCED STABILITY
    useEffect(() => {
        let isCancelled = false;
        let renderTasks: any[] = [];
        let initializationTimeout: NodeJS.Timeout;
        
        const initialize = async () => {
            if (isCancelled) return;
            
            // Add small delay to allow proper component mounting
            await new Promise(resolve => {
                initializationTimeout = setTimeout(resolve, 100);
            });
            
            if (isCancelled) return;
            
            setIsLoading(true);
            setError(null);
            
            // Önceki PDF verilerini temizle
            setPdfPagesAsImages([]);
            setCanvasStates({});
            setCurrentPage(1);
            setSelectedObject(null);
            
            console.log('🔄 PDF yükleme başlıyor:', pdfFile.name);
            
            try {
                if (!fabric) fabric = (await import('fabric')).fabric;
                if (!pdfjsLib) {
                    pdfjsLib = await import('pdfjs-dist');
                }
                
                // Worker URL'yi her seferinde ayarla (Next.js development mode için)
                if (pdfjsLib && (!pdfjsLib.GlobalWorkerOptions.workerSrc || pdfjsLib.GlobalWorkerOptions.workerSrc.includes('localhost'))) {
                    console.log('🔧 PDF.js worker URL ayarlanıyor...');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
                    console.log('✅ Worker URL ayarlandı:', pdfjsLib.GlobalWorkerOptions.workerSrc);
                }
                
                if (isCancelled) return;
                
                const arrayBuffer = await pdfFile.arrayBuffer();
                if (isCancelled) return;
                
                const pdf = await pdfjsLib.getDocument({ 
                    data: arrayBuffer,
                    stopAtErrors: false  // Continue even if there are errors
                }).promise;
                
                if (isCancelled) return;
                
                setPdfDocument(pdf); // State'e kaydet
                const pageUrls: string[] = [];
                
                console.log(`📄 PDF sayfa sayısı: ${pdf.numPages}`);
                
                // Render pages sequentially with proper cancellation checks
                for (let i = 1; i <= pdf.numPages; i++) {
                    if (isCancelled) {
                        console.log('🚫 PDF render işlemi iptal edildi');
                        return;
                    }
                    
                    try {
                        const page = await pdf.getPage(i);
                        if (isCancelled) break;
                        
                        const viewport = page.getViewport({ scale: 2.0 });
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.height = viewport.height;
                        tempCanvas.width = viewport.width;
                        const context = tempCanvas.getContext('2d');
                        
                        if (context && !isCancelled) {
                            const renderTask = page.render({ canvasContext: context, viewport });
                            renderTasks.push(renderTask);
                            
                            try {
                                await renderTask.promise;
                                if (!isCancelled) {
                                    pageUrls.push(tempCanvas.toDataURL('image/png'));
                                    console.log(`✅ Sayfa ${i} render edildi`);
                                }
                            } catch (error: any) {
                                if (error.name === 'RenderingCancelledException') {
                                    console.log(`🚫 Sayfa ${i} render iptal edildi - normal durum`);
                                    break;
                                }
                                console.warn(`⚠️ Sayfa ${i} render hatası (devam edildi):`, error.message);
                                // Continue with empty placeholder for failed page
                                if (!isCancelled) {
                                    pageUrls.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
                                }
                            }
                        }
                        
                        // Small delay between pages to prevent overwhelming
                        if (!isCancelled && i < pdf.numPages) {
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }
                    } catch (pageError: any) {
                        console.warn(`⚠️ Sayfa ${i} yükleme hatası:`, pageError.message);
                        // Continue with placeholder
                        if (!isCancelled) {
                            pageUrls.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
                        }
                    }
                }
                
                if (!isCancelled && pageUrls.length > 0) {
                    setPdfPagesAsImages(pageUrls);
                    console.log('🎉 PDF başarıyla yüklendi:', pageUrls.length, 'sayfa');
                    console.log('📸 İlk sayfa URL preview:', pageUrls[0]?.substring(0, 50) + '...');
                    
                    // Add delay before setting loading to false to ensure state stability
                    await new Promise(resolve => setTimeout(resolve, 50));
                    if (!isCancelled) {
                        setIsLoading(false);
                    }
                } else if (!isCancelled) {
                    throw new Error('Hiçbir sayfa render edilemedi');
                }
            } catch (err: any) { 
                if (!isCancelled) {
                    console.error('❌ PDF yükleme hatası:', err);
                    setError(`PDF yükleme hatası: ${err.message}`); 
                    setIsLoading(false);
                }
            }
        };
        
        if (pdfFile) {
            initialize();
        }
        
        // Cleanup on unmount
        return () => {
            console.log('🧹 Step2Editor PDF cleanup başlıyor...');
            isCancelled = true;
            
            // Clear initialization timeout
            if (initializationTimeout) {
                clearTimeout(initializationTimeout);
            }
            
            // Aktif render görevlerini iptal et
            renderTasks.forEach(task => {
                try {
                    task.cancel();
                } catch (e) {
                    console.log('Render task cancellation:', e);
                }
            });
            
            // Reset states safely
            setPdfPagesAsImages([]);
            setCanvasStates({});
            setSelectedObject(null);
        };
    }, [pdfFile]);
    
    // 2. Fabric Canvas'ı başlat - ENHANCED STABILITY
    useEffect(() => {
        console.log('🎨 Fabric Canvas useEffect:', { 
            fabric: !!fabric, 
            canvasRef: !!canvasRef.current, 
            fabricCanvas: !!fabricCanvas,
            isLoading 
        });
        
        // Only initialize if conditions are met and not already initialized
        if (fabric && canvasRef.current && !fabricCanvas && !isLoading) {
            console.log('🎨 Fabric Canvas başlatılıyor...');
            
            let initializationTimeout: NodeJS.Timeout;
            
            // Add small delay for DOM stability
            initializationTimeout = setTimeout(() => {
                try {
                    if (canvasRef.current && !fabricCanvas) {
                        const canvas = new fabric.Canvas(canvasRef.current, {
                            // Add stability options
                            enableRetinaScaling: false,
                            renderOnAddRemove: true,  // Enable automatic rendering when objects are added/removed
                            skipTargetFind: false
                        });
                        
                        setFabricCanvas(canvas);
                        
                        const onSelection = () => setSelectedObject(canvas.getActiveObject());
                        const onClearSelection = () => setSelectedObject(null);
                        
                        canvas.on({ 
                            'selection:created': onSelection, 
                            'selection:updated': onSelection, 
                            'selection:cleared': onClearSelection 
                        });
                        
                        console.log('✅ Fabric Canvas hazır');
                    }
                } catch (error) {
                    console.error('❌ Fabric Canvas initialization error:', error);
                }
            }, 50);
            
            return () => {
                if (initializationTimeout) {
                    clearTimeout(initializationTimeout);
                }
            };
        }
        
        return () => { 
            if (fabricCanvas) {
                console.log('🧹 Fabric Canvas temizleniyor...');
                try {
                    fabricCanvas.off(); // Tüm event listener'ları kaldır
                    if (fabricCanvas.getElement && fabricCanvas.getElement()) {
                        fabricCanvas.clear(); // Canvas'ı temizle
                    }
                    fabricCanvas.dispose(); // Canvas'ı dispose et
                    setFabricCanvas(null);
                    setSelectedObject(null);
                    console.log('✅ Fabric Canvas temizlendi');
                } catch (e) {
                    console.log('Fabric Canvas cleanup error (ignorable):', e);
                    setFabricCanvas(null);
                    setSelectedObject(null);
                }
            }
        };
    }, [fabric, fabricCanvas, isLoading]);

    // 3. Canvas boyutunu ve arkaplanını ayarla - ENHANCED STABILITY
    useEffect(() => {
        console.log('🖼️ Canvas background useEffect:', {
            fabricCanvas: !!fabricCanvas,
            pdfPagesCount: pdfPagesAsImages.length,
            containerRef: !!containerRef.current,
            currentPage,
            firstPageUrl: pdfPagesAsImages[0]?.substring(0, 50),
            isLoading
        });
        
        // Enhanced requirement check with loading state
        if (!fabricCanvas || pdfPagesAsImages.length === 0 || !containerRef.current || isLoading) {
            console.log('⏸️ Canvas background atlandı - gereksinimler karşılanmadı', {
                fabricCanvas: !!fabricCanvas,
                pdfPagesLength: pdfPagesAsImages.length,
                containerRef: !!containerRef.current,
                isLoading
            });
            return;
        }

        let isCancelled = false;
        let resizeObserver: ResizeObserver | null = null;

        const resizeAndDraw = async () => {
            if (isCancelled || !containerRef.current || !fabricCanvas) return;
            
            try {
                console.log(`🖼️ Canvas background ayarlanıyor - Sayfa ${currentPage}`);
                const imageUrl = pdfPagesAsImages[currentPage - 1];
                
                if (!imageUrl) {
                    console.error('❌ Sayfa için resim URL bulunamadı:', currentPage);
                    return;
                }
                
                console.log(`📸 Yüklenecek resim URL:`, imageUrl?.substring(0, 100) + '...');
                
                // Use Promise wrapper for fabric.Image.fromURL
                const img = await new Promise<any>((resolve, reject) => {
                    fabric.Image.fromURL(imageUrl, (fabricImg: any) => {
                        if (fabricImg && fabricImg.width && fabricImg.height) {
                            resolve(fabricImg);
                        } else {
                            reject(new Error('Invalid image loaded'));
                        }
                    }, {
                        crossOrigin: 'anonymous'
                    });
                });
                
                if (isCancelled) return;
                
                console.log('🖼️ Fabric Image yüklendi:', img);
                
                const containerWidth = containerRef.current!.clientWidth;
                const scale = containerWidth / img.width;
                const canvasHeight = img.height * scale;
                
                console.log(`📐 Canvas boyutları: ${containerWidth}x${canvasHeight} (scale: ${scale})`);
                
                if (containerWidth <= 0 || canvasHeight <= 0) {
                    console.error('❌ Geçersiz canvas boyutları:', { containerWidth, canvasHeight });
                    return;
                }
                
                if (isCancelled) return;
                
                fabricCanvas.setDimensions({ width: containerWidth, height: canvasHeight });
                
                // Clear canvas first
                try {
                    fabricCanvas.clear();
                } catch (e) {
                    console.warn('Canvas clear error (ignorable):', e);
                }
                
                if (isCancelled) return;
                
                // Set background with proper error handling
                await new Promise<void>((resolve, reject) => {
                    fabricCanvas.setBackgroundImage(img, () => {
                        if (isCancelled) return;
                        
                        console.log(`✅ Sayfa ${currentPage} arka planı ayarlandı`);
                        
                        // Load page-specific objects
                        const currentState = canvasStates[currentPage];
                        if (currentState && currentState.objects) {
                            console.log(`📄 Sayfa ${currentPage} state yükleniyor:`, currentState.objects.length, 'obje');
                            
                            currentState.objects.forEach((objData: any) => {
                                if (objData.data && objData.data.pageIndex === currentPage) {
                                    fabric.util.enlivenObjects([objData], (objects: any[]) => {
                                        if (!isCancelled) {
                                            objects.forEach(obj => {
                                                fabricCanvas.add(obj);
                                            });
                                            fabricCanvas.renderAll();
                                        }
                                    });
                                }
                            });
                        } else {
                            console.log(`📄 Sayfa ${currentPage} boş - yeni sayfa`);
                            fabricCanvas.renderAll();
                        }
                        
                        // Final render to ensure everything is visible
                        requestAnimationFrame(() => {
                            if (!isCancelled && fabricCanvas) {
                                fabricCanvas.renderAll();
                            }
                        });
                        
                        resolve();
                    }, { scaleX: scale, scaleY: scale });
                });
                
            } catch (error: any) {
                console.error('❌ Canvas background ayarlama hatası:', error);
            }
        };

        // Initial draw with delay
        const initializeDraw = async () => {
            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for stability
            if (!isCancelled) {
                await resizeAndDraw();
            }
        };

        initializeDraw();
        
        // Setup resize observer
        try {
            resizeObserver = new ResizeObserver(() => {
                if (!isCancelled) {
                    resizeAndDraw();
                }
            });
            resizeObserver.observe(containerRef.current);
        } catch (error) {
            console.warn('ResizeObserver setup error:', error);
        }
        
        return () => { 
            isCancelled = true;
            if (resizeObserver) {
                try {
                    resizeObserver.disconnect();
                } catch (e) {
                    console.log('ResizeObserver disconnect error (ignorable):', e);
                }
            }
        };
    }, [fabricCanvas, pdfPagesAsImages, currentPage, canvasStates, isLoading]);

    const changePage = (newPage: number) => {
        if (!fabricCanvas || newPage === currentPage) return;
        
        console.log(`📄 Sayfa değişimi: ${currentPage} -> ${newPage}`);
        
        // STRICT: Mevcut sayfanın durumunu kaydet - sadece bu sayfaya ait objeleri
        const currentObjects = fabricCanvas.getObjects().filter((obj: any) => {
            // Sadece bizim eklediğimiz ve bu sayfaya ait olanları kaydet
            return obj.data && obj.data.columnName && obj.data.pageIndex === currentPage;
        });
        
        console.log(`💾 Sayfa ${currentPage} kaydediliyor:`, currentObjects.length, 'obje');
        
        // Canvas'ı serialize ederken sadece filtrelenmiş objeleri kaydet
        const filteredCanvas = new fabric.Canvas();
        currentObjects.forEach((obj: any) => filteredCanvas.add(obj));
        
        setCanvasStates(prev => ({ 
            ...prev, 
            [currentPage]: {
                objects: currentObjects.map((obj: any) => obj.toObject(['data', 'fill', 'fontSize', 'fontFamily'])),
                width: fabricCanvas.getWidth(),
                height: fabricCanvas.getHeight()
            }
        }));
        
        // Canvas'ı temizle
        fabricCanvas.clear();
        
        // Yeni sayfaya geç
        setCurrentPage(newPage);
        setSelectedObject(null); // Seçimi temizle
        
        // Force render after page change
        requestAnimationFrame(() => {
            if (fabricCanvas) {
                fabricCanvas.renderAll();
            }
        });
        
        console.log(`✅ Sayfa ${newPage} aktif`);
    };

    // COMPONENT UNMOUNT CLEANUP
    useEffect(() => {
        return () => {
            console.log('🧹 Step2Editor unmounting - full cleanup başlatılıyor...');
            
            // Fabric Canvas cleanup - SAFE
            if (fabricCanvas) {
                try {
                    fabricCanvas.off();
                    if (fabricCanvas.getElement && fabricCanvas.getElement()) {
                        fabricCanvas.clear(); 
                    }
                    fabricCanvas.dispose();
                } catch (e) {
                    console.log('Fabric cleanup error (ignorable):', e);
                }
            }
            
            // PDF.js cleanup - state değişkenini kullan
            if (pdfDocument) {
                try {
                    pdfDocument.destroy();
                } catch (e) {
                    console.log('PDF cleanup error (ignorable):', e);
                }
            }
            
            // PDF.js worker cleanup
            if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
                try {
                    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                } catch (e) {
                    console.log('Worker cleanup error (ignorable):', e);
                }
            }
            
            // Memory cleanup
            if (typeof window !== 'undefined' && 'gc' in window) {
                try {
                    (window as any).gc();
                } catch (e) {
                    console.log('GC cleanup error (ignorable):', e);
                }
            }
            
            console.log('✅ Step2Editor cleanup tamamlandı');
        };
    }, [fabricCanvas, pdfDocument]);

    const addFieldToCanvas: DragEventHandler<HTMLDivElement> = (e) => {
        e.preventDefault();
        if (!fabricCanvas) return;
        
        const columnName = e.dataTransfer.getData('columnName');
        const isQRCode = e.dataTransfer.getData('isQRCode') === 'true';
        const canvasBounds = fabricCanvas.getElement().getBoundingClientRect();
        const x = e.clientX - canvasBounds.left;
        const y = e.clientY - canvasBounds.top;
        
        console.log(`➕ Yeni field ekleniyor: "${columnName}" sayfa ${currentPage} konumu (${x}, ${y})`);
        
        const options = { 
            left: x, 
            top: y, 
            fontSize: 12, 
            fontFamily: 'Inter', 
            fill: '#000000', 
            width: 150, 
            padding: 5, 
            editable: false, 
            data: { 
                id: `field_${currentPage}_${columnName}_${Date.now()}`, 
                columnName, 
                isQRCode, 
                pageIndex: currentPage  // CRITICAL: Force current page
            } 
        };
        
        const textObject = new fabric.Textbox(
            isQRCode ? `[QR] ${columnName}` : `{{${columnName}}}`, 
            options
        );
        
        fabricCanvas.add(textObject).setActiveObject(textObject);
        fabricCanvas.renderAll(); // Force render to ensure visibility
        console.log(`✅ Field eklendi: "${columnName}" -> Sayfa ${currentPage}`);
    };

    const handleStyleChange = (style: any) => {
        if(selectedObject) {
            console.log(`🎨 Stil değiştiriliyor:`, style);
            console.log(`📝 Seçili obje tipi:`, selectedObject.type);
            console.log(`🔍 Mevcut stil:`, {
                fontSize: selectedObject.get('fontSize'),
                fill: selectedObject.get('fill'),
                fontFamily: selectedObject.get('fontFamily')
            });
            
            // Style değişikliğini uygula
            Object.keys(style).forEach(key => {
                selectedObject.set(key, style[key]);
            });
            
            // Canvas'ı yeniden çiz - force render
            fabricCanvas.renderAll();
            selectedObject.setCoords(); // Update object coordinates for selection
            
            console.log(`✅ Yeni stil uygulandı:`, {
                fontSize: selectedObject.get('fontSize'),
                fill: selectedObject.get('fill'),
                fontFamily: selectedObject.get('fontFamily')
            });
        } else {
            console.warn('⚠️ Seçili obje yok - stil değiştirilemez');
        }
    };
    
    const handleNext = () => {
        if (!fabricCanvas) return;
        
        // Son sayfanın durumunu da kaydet - TÜM STİL BİLGİLERİYLE
        const currentPageObjects = fabricCanvas.getObjects().filter((obj: any) => {
            return obj.data && obj.data.columnName && obj.data.pageIndex === currentPage;
        });
        
        const finalCanvasStates = { 
            ...canvasStates, 
            [currentPage]: {
                objects: currentPageObjects.map((obj: any) => obj.toObject(['data', 'fill', 'fontSize', 'fontFamily'])),
                width: fabricCanvas.getWidth(),
                height: fabricCanvas.getHeight()
            }
        };
        
        const finalFields: PDFField[] = [];
        const previewSizesMap: { [pageIndex: number]: { width: number; height: number; }} = {};

        console.log('🔍 Sayfalar arası durum kontrolü:', finalCanvasStates);

        // Her sayfanın durumunu işle - CROSS-PAGE FIELD FIX
        Object.keys(finalCanvasStates).forEach(pageIndexStr => {
            const pageIndex = parseInt(pageIndexStr, 10);
            const state = finalCanvasStates[pageIndex];
            
            console.log(`📄 Sayfa ${pageIndex} işleniyor:`, state);
            
            if (state && state.objects) {
                state.objects.forEach((obj: any) => {
                    // Sadece bizim eklediğimiz alanları işle ve sayfa doğrulaması yap
                    if (obj.data && obj.data.columnName) {
                        // CRITICAL: Ensure pageIndex matches the current page being processed
                        const correctPageIndex = obj.data.pageIndex || pageIndex;
                        
                        // Cross-page field mixing prevention
                        if (correctPageIndex !== pageIndex) {
                            console.warn(`⚠️ Field "${obj.data.columnName}" sayfa uyuşmazlığı: object.pageIndex=${obj.data.pageIndex}, processing page=${pageIndex}`);
                        }
                        
                        const field: PDFField = {
                            id: obj.data.id || `field_${pageIndex}_${obj.data.columnName}_${Date.now()}`,
                            columnName: obj.data.columnName,
                            isQRCode: obj.data.isQRCode || false,
                            pageIndex: pageIndex, // FORCE page index from the state key
                            // Pozisyon ve boyut
                            x: obj.left || 0,
                            y: obj.top || 0,
                            width: obj.width || 100,
                            height: obj.height || 20,
                            scaleX: obj.scaleX || 1,
                            scaleY: obj.scaleY || 1,
                            angle: obj.angle || 0,
                            // Stil özellikleri
                            fontSize: obj.fontSize || 12,
                            fill: obj.fill || '#000000',
                            fontFamily: obj.fontFamily || 'Inter',
                            textAlign: (obj.textAlign || 'left') as 'left' | 'center' | 'right',
                            fontWeight: (obj.fontWeight || 'normal') as 'normal' | 'bold',
                            fontStyle: (obj.fontStyle || 'normal') as 'normal' | 'italic'
                        };
                        
                        finalFields.push(field);
                        console.log(`✅ Field added: ${field.columnName} -> Page ${field.pageIndex}`);
                    }
                });
            }
            
            // Sayfa boyutlarını kaydet - Canvas background dimensions fix
            if (fabricCanvas && pageIndex === currentPage) {
                previewSizesMap[pageIndex] = { 
                    width: fabricCanvas.getWidth(), 
                    height: fabricCanvas.getHeight() 
                };
            } else if (state && state.width && state.height) {
                previewSizesMap[pageIndex] = { 
                    width: state.width, 
                    height: state.height 
                };
            }
        });
        
        console.log('🎯 Final fields:', finalFields);
        console.log('📏 Preview sizes:', previewSizesMap);
        
        onFieldsConfigured(finalFields, previewSizesMap);
    };

    const handleDragStart = (e: React.DragEvent, columnName: string, isQRCode = false) => {
        e.dataTransfer.setData('columnName', columnName);
        e.dataTransfer.setData('isQRCode', isQRCode.toString());
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
                    <p>Loading PDF...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
                <div className="text-center text-red-400">
                    <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4" />
                    <p>Error: {error}</p>
                    <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
                        Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-900 text-white">
            {/* Sol Panel - Excel Kolonları */}
            <div className="w-64 bg-slate-800 p-4 flex flex-col shrink-0 border-r border-slate-700">
                <button 
                    onClick={onBack}
                    className="mb-4 flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Back
                </button>
                
                <h3 className="text-lg font-semibold mb-4">Excel Columns</h3>
                <div className="space-y-2 flex-1 overflow-y-auto">
                    {excelData.headers.map((header, index) => (
                        <div key={`${header}-${index}`} className="space-y-1">
                            {/* Normal Text Field */}
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, header, false)}
                                className="p-2 bg-slate-700 rounded cursor-move hover:bg-slate-600 text-sm flex items-center gap-2"
                            >
                                <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                                {header}
                            </div>
                            {/* QR Code Field */}
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, header, true)}
                                className="p-2 bg-blue-600 rounded cursor-move hover:bg-blue-500 text-sm flex items-center gap-2"
                                title="Add as QR Code"
                            >
                                <QrCodeIcon className="w-4 h-4 text-white" />
                                QR: {header}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Orta Panel - PDF Editörü */}
            <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden" onDrop={addFieldToCanvas} onDragOver={(e) => e.preventDefault()}>
                <div ref={containerRef} className="w-full flex-1 flex items-start justify-center bg-black/20 rounded-lg overflow-auto p-4">
                    <canvas ref={canvasRef} className="shadow-2xl border border-slate-600" />
                </div>
                
                {/* Sayfa Navigasyonu */}
                {pdfPagesAsImages.length > 1 && (
                    <div className="flex-shrink-0 flex items-center justify-center gap-4">
                        <button 
                            onClick={() => changePage(currentPage - 1)} 
                            disabled={currentPage === 1} 
                            className="p-2 bg-slate-700 rounded disabled:opacity-50 hover:bg-slate-600 disabled:cursor-not-allowed"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <span className="px-4 py-2 bg-slate-800 rounded">
                            Page {currentPage} / {pdfPagesAsImages.length}
                        </span>
                        <button 
                            onClick={() => changePage(currentPage + 1)} 
                            disabled={currentPage >= pdfPagesAsImages.length} 
                            className="p-2 bg-slate-700 rounded disabled:opacity-50 hover:bg-slate-600 disabled:cursor-not-allowed"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </main>

            {/* Sağ Panel - Alan Özellikleri */}
            <aside className="w-72 bg-slate-800 p-4 overflow-y-auto shrink-0 border-l border-slate-700">
                <h3 className="text-lg font-semibold mb-4">Field Properties</h3>
                {selectedObject ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Font Size</label>
                            <input 
                                type="number" 
                                min="8"
                                max="72"
                                value={selectedObject.get('fontSize') || 12} 
                                onChange={(e) => {
                                    const newSize = parseInt(e.target.value) || 12;
                                    console.log(`📏 Font boyutu değiştiriliyor:`, newSize);
                                    handleStyleChange({ fontSize: newSize });
                                }}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Color</label>
                            <input 
                                type="color" 
                                value={selectedObject.get('fill') || '#000000'} 
                                onChange={(e) => {
                                    console.log(`🎨 Renk değiştiriliyor:`, e.target.value);
                                    handleStyleChange({ fill: e.target.value });
                                }}
                                className="w-full h-10 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer"
                                title="Change text color"
                            />
                            <div className="text-xs text-slate-400 mt-1">
                                Current: {selectedObject.get('fill') || '#000000'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Font Family</label>
                            <select 
                                value={selectedObject.get('fontFamily') || 'Inter'} 
                                onChange={(e) => {
                                    console.log(`🔤 Font ailesi değiştiriliyor:`, e.target.value);
                                    handleStyleChange({ fontFamily: e.target.value });
                                }}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            >
                                {SUPPORTED_FONTS.map(font => (
                                    <option key={font.name} value={font.name}>{font.name}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={() => { 
                                fabricCanvas.remove(selectedObject); 
                                setSelectedObject(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
                        >
                            <TrashIcon className="w-4 h-4" /> 
                            Delete
                        </button>
                    </div>
                ) : (
                    <p className="text-slate-400 text-center">
                        Düzenlemek için bir alan seçin veya<br />
                        <span className="text-sm">sol panelden alan sürükleyip bırakın</span>
                    </p>
                )}
                
                <div className="mt-8 pt-4 border-t border-slate-700">
                    <button 
                        onClick={handleNext}
                        className="w-full px-4 py-3 bg-teal-600 rounded-lg hover:bg-teal-700 font-medium"
                    >
                        İncele ve Oluştur
                    </button>
                </div>
            </aside>
        </div>
    );
}