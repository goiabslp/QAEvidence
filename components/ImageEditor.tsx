
import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Crop, Square, Undo, RotateCcw, Save, ZoomIn } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (editedImageSrc: string) => void;
  onCancel: () => void;
}

type Tool = 'CROP' | 'BOX';

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('CROP');
  
  // History Management for Undo
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  
  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [cropSelection, setCropSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  // Load initial image
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      // Push initial state
      setHistory([imageSrc]);
      setHistoryStep(0);
    };
  }, [imageSrc]);

  // Redraw canvas whenever history or interaction changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = history[historyStep];
    
    img.onload = () => {
      // Resize canvas to match image dimensions
      canvas.width = img.width;
      canvas.height = img.height;

      // 1. Draw Base Image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // 2. Draw Active Interaction (Drag)
      if (isDragging || cropSelection) {
        const x = startPos.x;
        const y = startPos.y;
        const w = currentPos.x - startPos.x;
        const h = currentPos.y - startPos.y;

        if (tool === 'BOX' && isDragging) {
          // Draw Red Box Preview
          ctx.strokeStyle = '#ef4444'; // Red-500
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, w, h);
          
          // Add semi-transparent fill
          ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
          ctx.fillRect(x, y, w, h);
        }

        if (tool === 'CROP') {
            // Calculate selection rect (handles negative width/height dragging)
            let selX = x;
            let selY = y;
            let selW = w;
            let selH = h;

            if (w < 0) { selX = x + w; selW = Math.abs(w); }
            if (h < 0) { selY = y + h; selH = Math.abs(h); }

            // Draw Dimmed Overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Clear the selection area (make it visible)
            ctx.clearRect(selX, selY, selW, selH);
            ctx.drawImage(img, selX, selY, selW, selH, selX, selY, selW, selH);

            // Draw selection border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.strokeRect(selX, selY, selW, selH);
            ctx.setLineDash([]);
        }
      }
    };
  }, [history, historyStep, isDragging, currentPos, tool, cropSelection]);

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setIsDragging(true);
    setStartPos(pos);
    setCurrentPos(pos);
    setCropSelection(null); // Clear previous crop selection if starting new drag
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCurrentPos(getMousePos(e));
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If nothing was really dragged (just a click), ignore
    if (Math.abs(currentPos.x - startPos.x) < 5 && Math.abs(currentPos.y - startPos.y) < 5) {
        return;
    }

    if (tool === 'BOX') {
      applyDrawingToHistory();
    } else if (tool === 'CROP') {
      // Just store the selection, wait for user to confirm "Apply Crop"
      let x = startPos.x;
      let y = startPos.y;
      let w = currentPos.x - startPos.x;
      let h = currentPos.y - startPos.y;

      if (w < 0) { x = x + w; w = Math.abs(w); }
      if (h < 0) { y = y + h; h = Math.abs(h); }
      
      setCropSelection({ x, y, w, h });
    }
  };

  const applyDrawingToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Get current state (which includes the drawing because we were rendering in loop, 
    // but wait, the render loop relies on history[step]. 
    // We need to manually draw the final shape on a fresh context to save it properly)
    
    const img = new Image();
    img.src = history[historyStep];
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if(!ctx) return;

        // Draw original
        ctx.drawImage(img, 0, 0);

        // Draw New Shape
        const x = startPos.x;
        const y = startPos.y;
        const w = currentPos.x - startPos.x;
        const h = currentPos.y - startPos.y;

        if (tool === 'BOX') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, w, h);
        }

        // Save
        const newData = tempCanvas.toDataURL('image/png');
        addToHistory(newData);
    };
  };

  const confirmCrop = () => {
    if (!cropSelection) return;
    
    const img = new Image();
    img.src = history[historyStep];
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropSelection.w;
        tempCanvas.height = cropSelection.h;
        const ctx = tempCanvas.getContext('2d');
        if(!ctx) return;

        ctx.drawImage(
            img, 
            cropSelection.x, cropSelection.y, cropSelection.w, cropSelection.h, 
            0, 0, cropSelection.w, cropSelection.h
        );

        const newData = tempCanvas.toDataURL('image/png');
        addToHistory(newData);
        setCropSelection(null); // Reset selection mode
        setTool('BOX'); // Switch back to box after crop for convenience
    };
  };

  const addToHistory = (newDataUrl: string) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newDataUrl);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setCropSelection(null);
    }
  };

  const handleSave = () => {
    onSave(history[historyStep]);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-fade-in">
        {/* Toolbar */}
        <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shadow-lg">
            <div className="flex items-center gap-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <ZoomIn className="w-5 h-5 text-indigo-400" />
                    Editor de Evidência
                </h3>
                <div className="h-6 w-px bg-slate-600 mx-2"></div>
                
                {/* Tools */}
                <div className="flex items-center bg-slate-700 rounded-lg p-1">
                    <button 
                        type="button"
                        onClick={() => { setTool('CROP'); setCropSelection(null); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            tool === 'CROP' 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-600'
                        }`}
                    >
                        <Crop className="w-4 h-4" />
                        CORTAR
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setTool('BOX'); setCropSelection(null); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            tool === 'BOX' 
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-600'
                        }`}
                    >
                        <Square className="w-4 h-4" />
                        DESTAQUE
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                 <button 
                    type="button"
                    onClick={handleUndo}
                    disabled={historyStep === 0}
                    className="text-slate-400 hover:text-white disabled:opacity-30 p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Desfazer"
                >
                    <Undo className="w-5 h-5" />
                </button>
                
                <div className="h-6 w-px bg-slate-600 mx-2"></div>

                <button 
                    type="button"
                    onClick={onCancel}
                    className="text-slate-300 hover:text-white px-4 py-2 font-semibold text-sm hover:bg-slate-700 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="button"
                    onClick={handleSave}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-all transform hover:scale-105"
                >
                    <Save className="w-4 h-4" />
                    Salvar Edição
                </button>
            </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
             <div className="relative shadow-2xl border border-slate-600 bg-black/50">
                 <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className={`max-w-full max-h-[80vh] block ${tool === 'CROP' ? 'cursor-crosshair' : 'cursor-cell'}`}
                 />
                 
                 {/* Floating Action for Crop Confirmation */}
                 {tool === 'CROP' && cropSelection && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 animate-bounce-in z-10">
                        <button 
                            type="button"
                            onClick={confirmCrop}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 ring-4 ring-black/20"
                        >
                            <Check className="w-4 h-4" /> Confirmar Corte
                        </button>
                        <button 
                            type="button"
                            onClick={() => setCropSelection(null)}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-full shadow-lg font-bold text-xs ring-4 ring-black/20"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                 )}
             </div>
        </div>
        
        <div className="bg-slate-900 text-slate-500 text-xs text-center py-2 border-t border-slate-800">
             {tool === 'CROP' ? 'Arraste para selecionar a área de corte.' : 'Arraste para desenhar um destaque vermelho.'}
        </div>
    </div>
  );
};

export default ImageEditor;
