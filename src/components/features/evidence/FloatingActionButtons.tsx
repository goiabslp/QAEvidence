import React from 'react';
import { Save, FileDown, Lock, Loader2, AlertCircle } from 'lucide-react';

interface FloatingActionButtonsProps {
    evidencesCount: number;
    onSave: () => void;
    onPdf: () => void;
    onClose: () => void;
    disabled: boolean;
    pdfError?: string | null;
    isSaveSuccess?: boolean;
}

const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
    evidencesCount,
    onSave,
    onPdf,
    onClose,
    disabled,
    pdfError,
    isSaveSuccess
}) => {
    // Always visible to show disabled state when new
    const isPdfLocked = evidencesCount === 0;

    return (
        <div className="sticky bottom-6 z-40 mt-8 pointer-events-none">
            <div className="flex flex-col items-center justify-center">
                {pdfError && (
                    <div className="mb-3 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-red-100 animate-slide-up shadow-lg pointer-events-auto">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {pdfError}
                    </div>
                )}

                {isSaveSuccess && (
                    <div className="mb-3 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-emerald-100 animate-slide-up shadow-lg pointer-events-auto">
                        <Save className="w-4 h-4 flex-shrink-0" />
                        Evidência Salva com Sucesso!
                    </div>
                )}

                <div className="flex flex-wrap gap-4 justify-center w-full sm:w-auto pointer-events-auto">
                    {/* Save Button */}
                    <button
                        onClick={onSave}
                        disabled={disabled}
                        className="group relative overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 px-8 py-3 text-white shadow-xl shadow-emerald-900/20 transition-all duration-300 hover:shadow-emerald-900/40 hover:-translate-y-1 active:scale-95 w-full sm:w-auto min-w-[160px] ring-1 ring-white/20 backdrop-blur-sm opacity-75 hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                        <div className="relative flex items-center justify-center gap-2 font-bold text-sm tracking-widest uppercase">
                            <Save className="w-5 h-5" />
                            Salvar Evidência
                        </div>
                    </button>

                    {/* PDF Button */}
                    <button
                        onClick={onPdf}
                        disabled={disabled || isPdfLocked}
                        className={`group relative overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-3 text-white shadow-xl shadow-blue-900/20 transition-all duration-300 hover:shadow-blue-900/40 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:grayscale w-full sm:w-auto min-w-[160px] ring-1 ring-white/20 backdrop-blur-sm opacity-75 hover:opacity-100 ${isPdfLocked ? 'cursor-not-allowed !opacity-90' : ''}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                        <div className="relative flex items-center justify-center gap-2 font-bold text-sm tracking-widest uppercase">
                            {disabled ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isPdfLocked ? (
                                <div className="relative w-5 h-5 flex items-center justify-center">
                                    <FileDown className="w-5 h-5 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-75" />
                                    <Lock className="w-5 h-5 absolute transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-100" />
                                </div>
                            ) : (
                                <FileDown className="w-5 h-5" />
                            )}
                            Baixar PDF
                        </div>
                    </button>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        disabled={disabled}
                        className="group relative overflow-hidden rounded-full bg-slate-100 border border-slate-200 px-8 py-3 text-slate-600 shadow-xl shadow-slate-900/10 transition-all duration-300 hover:bg-white hover:text-slate-800 hover:-translate-y-1 active:scale-95 w-full sm:w-auto min-w-[160px]"
                    >
                        <div className="relative flex items-center justify-center gap-2 font-bold text-sm tracking-widest uppercase">
                            <AlertCircle className="w-5 h-5 opacity-70" />
                            Fechar
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FloatingActionButtons;
