
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Crop, Square, Undo, RotateCcw, Save, ZoomIn, ArrowUpRight, Type } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (editedImageSrc: string) => void;
  onCancel: () => void;
  initialTool?: Tool;
}

type Tool = 'CROP' | 'BOX' | 'ARROW' | 'TEXT';

interface TextEditingState {
  canvasX: number;
  canvasY: number;
  screenX: number;
  screenY: number;
  value: string;
}

const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color = '#ef4444', lineWidth = 4) => {
  const headLength = Math.max(12, Math.round(Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2) * 0.1));
  const actualHeadLength = Math.min(25, headLength);
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Desenhar corpo
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Desenhar cabeça
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - actualHeadLength * Math.cos(angle - Math.PI / 6), toY - actualHeadLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - actualHeadLength * Math.cos(angle + Math.PI / 6), toY - actualHeadLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
};

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onCancel, initialTool }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>(initialTool || 'CROP');
  
  // History Management for Undo
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  
  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [cropSelection, setCropSelection] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [textEditing, setTextEditing] = useState<TextEditingState | null>(null);

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

        if (tool === 'ARROW' && isDragging) {
          // Draw Red Arrow Preview
          drawArrow(ctx, x, y, currentPos.x, currentPos.y);
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
    if (textEditing) return; // ignore clicks while typing
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

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const pos = currentPos;

    if (tool === 'TEXT' && e) {
      if (Math.abs(pos.x - startPos.x) < 5 && Math.abs(pos.y - startPos.y) < 5) {
        setTextEditing({
          canvasX: startPos.x,
          canvasY: startPos.y,
          screenX: e.clientX,
          screenY: e.clientY,
          value: ''
        });
      }
      return;
    }

    // If nothing was really dragged (just a click), ignore
    if (Math.abs(pos.x - startPos.x) < 5 && Math.abs(pos.y - startPos.y) < 5) {
        return;
    }

    if (tool === 'BOX' || tool === 'ARROW') {
      applyDrawingToHistory();
    } else if (tool === 'CROP') {
      // Just store the selection, wait for user to confirm "Apply Crop"
      let x = startPos.x;
      let y = startPos.y;
      let w = pos.x - startPos.x;
      let h = pos.y - startPos.y;

      if (w < 0) { x = x + w; w = Math.abs(w); }
      if (h < 0) { y = y + h; h = Math.abs(h); }
      
      setCropSelection({ x, y, w, h });
    }
  };

  const applyDrawingToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
        } else if (tool === 'ARROW') {
            drawArrow(ctx, x, y, currentPos.x, currentPos.y);
        }

        // Save
        const newData = tempCanvas.toDataURL('image/png');
        addToHistory(newData);
    };
  };

  const saveTextToCanvas = () => {
    if (!textEditing) return;
    const text = textEditing.value.trim();
    setTextEditing(null); // Close input
    if (!text) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.src = history[historyStep];
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        // Draw original
        ctx.drawImage(img, 0, 0);

        // Draw Text
        ctx.fillStyle = '#ef4444';
        const fontSize = Math.max(20, Math.round(img.width * 0.02));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(text, textEditing.canvasX, textEditing.canvasY);

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-fade-in">
        {/* Toolbar */}
        <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shadow-lg">
            <div className="flex items-center gap-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <ZoomIn className="w-5 h-5 text-indigo-400" />
                    Editor de Evidência
                </h3>
                <div className="h-6 w-px bg-slate-600 mx-2"></div>
                
                {/* Tools */}
                <div className="flex items-center bg-slate-700 rounded-lg p-1 gap-1">
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
                    <button 
                        type="button"
                        onClick={() => { setTool('ARROW'); setCropSelection(null); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            tool === 'ARROW' 
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-600'
                        }`}
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        SETA
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setTool('TEXT'); setCropSelection(null); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            tool === 'TEXT' 
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-600'
                        }`}
                    >
                        <Type className="w-4 h-4" />
                        TEXTO
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
                     onMouseUp={(e) => handleMouseUp(e)}
                     onMouseLeave={() => handleMouseUp()}
                     className={`max-w-full max-h-[80vh] block ${
                       tool === 'CROP' ? 'cursor-crosshair' : tool === 'TEXT' ? 'cursor-text' : 'cursor-cell'
                     }`}
                  />
                  
                  {/* Floating Input for Text Tool */}
                  {textEditing && (
                    <input
                      autoFocus
                      type="text"
                      value={textEditing.value}
                      onChange={(e) => setTextEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveTextToCanvas();
                        } else if (e.key === 'Escape') {
                          setTextEditing(null);
                        }
                      }}
                      onBlur={saveTextToCanvas}
                      placeholder="Digite o texto..."
                      className="fixed z-[10000] bg-slate-950 text-[#ef4444] border-2 border-red-500 rounded-lg px-3 py-1.5 outline-none font-extrabold shadow-2xl animate-fade-in placeholder-red-300/40 text-base"
                      style={{
                        top: textEditing.screenY - 20,
                        left: textEditing.screenX - 10,
                        minWidth: '200px',
                      }}
                    />
                  )}
                  
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
             {tool === 'CROP' && 'Arraste para selecionar a área de corte.'}
             {tool === 'BOX' && 'Arraste para desenhar um destaque vermelho.'}
             {tool === 'ARROW' && 'Arraste para desenhar uma seta vermelha.'}
             {tool === 'TEXT' && 'Clique na imagem para adicionar um texto explicativo vermelho.'}
        </div>
    </div>,
    document.body
  );
};

export default ImageEditor;
