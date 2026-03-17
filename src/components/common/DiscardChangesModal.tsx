import React from 'react';
import { AlertCircle, X, ChevronRight, History } from 'lucide-react';

interface DiscardChangesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const DiscardChangesModal: React.FC<DiscardChangesModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-rose-50 px-6 py-6 flex items-center gap-4 border-b border-rose-100">
                    <div className="p-3 bg-rose-100 rounded-2xl text-rose-600 shadow-sm">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 leading-tight">
                            Descartar alterações?
                        </h3>
                        <p className="text-rose-700 text-sm font-medium mt-0.5">
                            Existem alterações não salvas no formulário.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-slate-600 leading-relaxed font-medium mb-8">
                        Ao fechar agora, todo o progresso atual será perdido permanentemente. Deseja realmente descartar e sair?
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onClose}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            Continuar editando
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        <button
                            onClick={onConfirm}
                            className="w-full bg-white hover:bg-rose-50 text-rose-600 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border border-transparent hover:border-rose-100"
                        >
                            Descartar e fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscardChangesModal;
