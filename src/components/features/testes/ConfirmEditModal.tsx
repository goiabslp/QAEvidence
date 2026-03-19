import React from 'react';
import { X, Check, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

interface ConfirmEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    fieldName: string;
    oldValue: string;
    newValue: string;
    onChangeNewValue: (val: string) => void;
    isSaving?: boolean;
}

const ConfirmEditModal: React.FC<ConfirmEditModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    fieldName,
    oldValue,
    newValue,
    onChangeNewValue,
    isSaving = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-0 flex justify-between items-start">
                    <div className="p-2.5 bg-indigo-50 rounded-2xl">
                        <RefreshCw className="w-5 h-5 text-indigo-600" />
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 pt-4">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight">
                        Editar Campo
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        Atualize o valor do campo <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded">{fieldName}</span>.
                    </p>

                    <div className="mt-6 space-y-3">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div> Valor Atual
                            </span>
                            <span className="text-sm font-semibold text-slate-600 truncate">
                                {oldValue || <span className="italic text-slate-300">Vazio</span>}
                            </span>
                        </div>

                        <div className="flex justify-center -my-1 relative z-10">
                            <div className="bg-white p-1 rounded-full border border-slate-100 shadow-sm">
                                <ArrowRight className="w-4 h-4 text-indigo-500 rotate-90" />
                            </div>
                        </div>

                        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50 flex flex-col gap-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-indigo-400"></div> Novo Valor
                            </span>
                            <textarea
                                value={newValue}
                                onChange={(e) => onChangeNewValue(e.target.value)}
                                autoFocus
                                className="w-full bg-white p-3 rounded-xl border border-indigo-200 text-sm text-slate-700 shadow-inner focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px] transition-all resize-none"
                                placeholder={`Digite o novo valor para ${fieldName}...`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (newValue !== oldValue) onConfirm();
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex items-center gap-3">
                        <div className="flex-1 p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-semibold text-amber-700 leading-tight">
                                Esta alteração será salva permanentemente no banco de dados.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-2 grid grid-cols-2 gap-3 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSaving || newValue === oldValue}
                        className="px-4 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        CONFIRMAR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmEditModal;
