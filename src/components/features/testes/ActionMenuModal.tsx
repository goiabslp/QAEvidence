import React from 'react';
import { X, CheckCircle2, LayoutTemplate, Briefcase as UseCaseIcon, Settings, UserSquare, MoreHorizontal } from 'lucide-react';
import { TestColumnKey } from '../../../types';
import { COLUMN_LABELS } from './TestSettings';

interface ActionMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCount: number;
    handleBatchResultChange: (res: string) => void;
    handleBatchAnalystChange: (acronym: string) => void;
    setBatchEditState: (state: any) => void;
    analysts: { acronym: string; name: string }[];
}

const ActionMenuModal: React.FC<ActionMenuModalProps> = ({
    isOpen,
    onClose,
    selectedCount,
    handleBatchResultChange,
    handleBatchAnalystChange,
    setBatchEditState,
    analysts
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <MoreHorizontal className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Ações em Lote</h2>
                            <p className="text-sm text-slate-500 font-medium">
                                <span className="text-amber-600 font-bold">{selectedCount}</span> registros selecionados
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
                    
                    {/* Alterar Resultado Section */}
                    <section>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-slate-300" />
                            Alterar Resultado
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {['Pendente', 'Em Andamento', 'Sucesso', 'Erro', 'Impedimento'].map(res => (
                                <button
                                    key={res}
                                    onClick={() => handleBatchResultChange(res)}
                                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 border-slate-100 bg-white hover:border-indigo-300 hover:shadow-md transition-all group"
                                >
                                    <div className={`w-4 h-4 rounded-full shadow-sm group-hover:scale-110 transition-transform ${
                                        res === 'Sucesso' ? 'bg-emerald-500' :
                                        res === 'Erro' ? 'bg-red-500' :
                                        res === 'Em Andamento' ? 'bg-blue-500' :
                                        res === 'Impedimento' ? 'bg-purple-500' :
                                        'bg-slate-300'
                                    }`} />
                                    <span className="text-xs font-bold text-slate-600 text-center leading-tight">
                                        {res}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Renomear Campo Section */}
                    <section>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <LayoutTemplate className="w-4 h-4 text-slate-300" />
                            Renomear Campo
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {['module', 'priority', 'backoffice', 'useCase', 'minimum'].map(field => {
                                const key = field as TestColumnKey;
                                return (
                                    <button
                                        key={field}
                                        onClick={() => {
                                            setBatchEditState({
                                                isOpen: true,
                                                field: key,
                                                newValue: '',
                                                isSaving: false
                                            });
                                            onClose();
                                        }}
                                        className="text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md transition-all"
                                    >
                                        <span className="text-sm font-semibold text-slate-700">{COLUMN_LABELS[key]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Transferir Analista Section */}
                    <section>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <UserSquare className="w-4 h-4 text-slate-300" />
                            Transferir Analista
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {analysts.map(a => (
                                <button
                                    key={a.acronym}
                                    onClick={() => handleBatchAnalystChange(a.acronym)}
                                    className="flex items-center gap-3 text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-md transition-all group"
                                    title={a.name}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                        {a.acronym.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="truncate">
                                        <div className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-700">{a.acronym}</div>
                                        <div className="text-xs text-slate-400 truncate group-hover:text-indigo-400">{a.name}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default ActionMenuModal;
