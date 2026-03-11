import React from 'react';
import { X, Filter, RefreshCw, Check, ChevronDown } from 'lucide-react';
import { FilterState, TestColumnKey } from '../../../types';
import { COLUMN_LABELS } from './TestSettings';

interface TestFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    onClear: () => void;
    filterOptions: Record<keyof FilterState, string[]>;
    initialFilters: FilterState;
}

const TestFilterModal: React.FC<TestFilterModalProps> = ({
    isOpen,
    onClose,
    onApply,
    onClear,
    filterOptions,
    initialFilters
}) => {
    const [pendingFilters, setPendingFilters] = React.useState<FilterState>(initialFilters);

    React.useEffect(() => {
        if (isOpen) {
            setPendingFilters(initialFilters);
        }
    }, [isOpen, initialFilters]);

    if (!isOpen) return null;

    const toggleFilter = (field: keyof FilterState, value: string) => {
        setPendingFilters(prev => {
            const current = [...prev[field]];
            const index = current.indexOf(value);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(value);
            }
            return { ...prev, [field]: current };
        });
    };

    const hasFilters = (Object.keys(pendingFilters) as Array<keyof FilterState>).some(key => pendingFilters[key].length > 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                            <Filter className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Filtros Avançados</h2>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Refine sua visualização de testes</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Grid Layout */}
                <div className="p-8 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-10">
                        {/* Section Header */}
                        <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Filtros Avançados</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {(Object.keys(filterOptions) as Array<keyof FilterState>).map((field) => {
                                const isMulti = !['priority', 'minimum'].includes(field);
                                const currentValues = pendingFilters[field];
                                const label = COLUMN_LABELS[field as TestColumnKey] || field;

                                return (
                                    <div key={field} className="group/field relative">
                                        <div className="flex items-center justify-between mb-2.5">
                                            <h4 className="text-[11px] font-black text-slate-400 group-hover/field:text-indigo-500 transition-colors uppercase tracking-[0.15em] flex items-center gap-2">
                                                {label}
                                                {currentValues.length > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-bold border border-indigo-100">
                                                        {currentValues.length}
                                                    </span>
                                                )}
                                            </h4>
                                            {currentValues.length > 0 && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPendingFilters(prev => ({ ...prev, [field]: [] }));
                                                    }}
                                                    className="text-[9px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors"
                                                >
                                                    Limpar
                                                </button>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <select
                                                multiple={isMulti}
                                                value={isMulti ? currentValues : (currentValues[0] || '')}
                                                onChange={(e) => {
                                                    const target = e.target as HTMLSelectElement;
                                                    if (isMulti) {
                                                        const values = Array.from(target.selectedOptions).map(opt => opt.value);
                                                        setPendingFilters(prev => ({ ...prev, [field]: values }));
                                                    } else {
                                                        setPendingFilters(prev => ({ ...prev, [field]: target.value ? [target.value] : [] }));
                                                    }
                                                }}
                                                className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer ${isMulti ? 'min-h-[120px] py-2' : ''}`}
                                            >
                                                {!isMulti && <option value="">Selecione uma opção...</option>}
                                                {filterOptions[field].map(value => {
                                                    let customStyle = '';
                                                    if (field === 'priority') {
                                                        if (value.toLowerCase().includes('alta')) customStyle = 'text-red-600';
                                                        if (value.toLowerCase().includes('baixa')) customStyle = 'text-blue-600';
                                                        if (value.toLowerCase().includes('média')) customStyle = 'text-emerald-600';
                                                    }
                                                    if (field === 'minimum') {
                                                        if (value === 'Sim') customStyle = 'text-emerald-600';
                                                        if (value === 'Não') customStyle = 'text-orange-600';
                                                    }
                                                    if (field === 'result') {
                                                        if (value === 'Sucesso') customStyle = 'text-emerald-600';
                                                        if (value === 'Erro') customStyle = 'text-red-600';
                                                        if (value === 'Em Andamento') customStyle = 'text-blue-600';
                                                        if (value === 'Impedimento') customStyle = 'text-purple-600';
                                                    }

                                                    return (
                                                        <option 
                                                            key={value} 
                                                            value={value}
                                                            className={`py-2 px-3 font-bold ${customStyle}`}
                                                        >
                                                            {value || '(Vazio)'}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            
                                            {!isMulti && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <ChevronDown className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>

                                        {isMulti && (
                                            <p className="mt-2 text-[10px] text-slate-400 font-medium italic">
                                                Hold Ctrl (or Cmd) to select multiple items
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button 
                        onClick={() => {
                            setPendingFilters(initialFilters);
                            onClear();
                        }}
                        disabled={!hasFilters}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-2xl transition-all ${
                            hasFilters 
                                ? 'text-red-500 hover:bg-red-50' 
                                : 'text-slate-300 cursor-not-allowed'
                        }`}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Limpar Todos
                    </button>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-2xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => onApply(pendingFilters)}
                            className="flex-1 sm:flex-none px-10 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform active:scale-95"
                        >
                            APLICAR FILTROS
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestFilterModal;
