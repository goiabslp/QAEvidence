import React, { useState, useEffect, useLayoutEffect } from 'react';
import { MoveUp, X, Sparkles } from 'lucide-react';

const MenuTutorial: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const calculatePosition = () => {
    const menuButton = document.getElementById('main-menu-button');
    if (menuButton) {
      const rect = menuButton.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useLayoutEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenMenuTutorial_v4');
    if (!hasSeenTutorial) {
      // Small delay to let the initial layout settle
      const timer = setTimeout(() => {
        calculatePosition();
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Recalculate on resize
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('resize', calculatePosition);
      return () => window.removeEventListener('resize', calculatePosition);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('hasSeenMenuTutorial_v4', 'true');
  };

  if (!isVisible || !coords) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Backdrop for focus effect */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in pointer-events-auto" onClick={handleDismiss} />

      {/* Tutorial Content Container */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Arrow - Pointing UP from BELOW the menu button */}
        <div 
          className="absolute pointer-events-none transition-all duration-500"
          style={{ 
            top: `${coords.top + coords.height + 8}px`, 
            left: `${coords.left + (coords.width / 2) - 16}px` 
          }}
        >
          <div className="animate-bounce-subtle text-indigo-500">
            <MoveUp className="w-8 h-8 filter drop-shadow-[0_0_15px_rgba(99,102,241,1)]" />
          </div>
        </div>

        {/* Info Box - Positioned below the arrow */}
        <div 
          className="absolute max-w-[280px] pointer-events-auto transition-all duration-500"
          style={{ 
            top: `${coords.top + coords.height + 56}px`, 
            left: `${Math.min(window.innerWidth - 300, Math.max(16, coords.left - 120))}px` 
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-indigo-500 p-5 animate-zoom-in relative group overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse-soft" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Nova Navegação!</h3>
              </div>
              
              <p className="text-xs font-medium text-slate-600 leading-relaxed mb-4">
                Agora o menu está centralizado aqui. Clique para navegar entre Chamados, BUGs, Evidências e Testes.
              </p>

              <button
                onClick={handleDismiss}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-200 uppercase tracking-widest flex items-center justify-center gap-2"
              >
                Entendido
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Precise highlight clip-path/box */}
        <div 
          className="absolute border-2 border-indigo-500 rounded-lg animate-pulse pointer-events-none"
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            height: `${coords.height}px`
          }}
        />
      </div>
    </div>
  );
};

export default MenuTutorial;
