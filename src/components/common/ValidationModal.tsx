import React from 'react';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';

interface ValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    invalidFields: string[];
}

const ValidationModal: React.FC<ValidationModalProps> = ({ isOpen, onClose, invalidFields }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-amber-50 px-6 py-6 flex items-center gap-4 border-b border-amber-100">
                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 shadow-sm animate-bounce-subtle">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 leading-tight">
                            Campos obrigatórios não preenchidos
                        </h3>
                        <p className="text-amber-700 text-sm font-medium mt-0.5">
                            Precisamos dessas informações para o relatório.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                        {invalidFields.map((field, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-amber-200 hover:bg-amber-50/30 transition-all duration-300"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                                <span className="text-slate-700 font-bold text-sm tracking-wide">
                                    {field}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        <CheckCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        OK, REVISAR CAMPOS
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ValidationModal;
