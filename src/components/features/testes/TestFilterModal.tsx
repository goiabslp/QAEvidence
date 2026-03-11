import React from 'react';
import { X, Filter, RefreshCw, Check, ChevronDown, Tag } from 'lucide-react';
import { FilterState, TestColumnKey } from '../../../types';
import { COLUMN_LABELS } from './TestSettings';

// Helper for semantic colors
const getSemanticStyle = (field: string, value: string) => {
    if (field === 'priority') {
        if (value.toLowerCase().includes('alta')) return 'bg-red-50 text-red-700 border-red-200';
        if (value.toLowerCase().includes('baixa')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (value.toLowerCase().includes('média')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (field === 'minimum') {
        if (value === 'Sim') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (value === 'Não') return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    if (field === 'result') {
        if (value === 'Sucesso') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (value === 'Erro') return 'bg-red-50 text-red-700 border-red-200';
        if (value === 'Em Andamento') return 'bg-blue-50 text-blue-700 border-blue-200';
        if (value === 'Impedimento') return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
};

interface FilterDropdownProps {
    field: keyof FilterState;
    options: string[];
    selectedValues: string[];
    onToggle: (field: keyof FilterState, value: string) => void;
    onClear: (field: keyof FilterState) => void;
    isMulti: boolean;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    field,
    options,
    selectedValues,
    onToggle,
    onClear,
    isMulti
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const label = COLUMN_LABELS[field as TestColumnKey] || field;

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="group/field relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-2.5 px-1">
                <h4 className="text-[11px] font-black text-slate-400 group-hover/field:text-indigo-500 transition-colors uppercase tracking-[0.15em] flex items-center gap-2">
                    {label}
                    {selectedValues.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-bold border border-indigo-100">
                            {selectedValues.length}
                        </span>
                    )}
                </h4>
                {selectedValues.length > 0 && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear(field);
                        }}
                        className="text-[9px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                    >
                        Limpar
                    </button>
                )}
            </div>

            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-white border-2 rounded-2xl p-2.5 transition-all cursor-pointer flex flex-wrap gap-1.5 items-center min-h-[52px] ${
                    isOpen ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-slate-300'
                }`}
            >
                {selectedValues.length === 0 ? (
                    <span className="text-sm font-semibold text-slate-400 pl-2">Selecione opções...</span>
                ) : (
                    selectedValues.map(val => (
                        <span 
                            key={val}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 animate-in zoom-in-95 duration-150 ${getSemanticStyle(field, val)}`}
                        >
                            {val}
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(field, val);
                                }}
                                className="hover:bg-black/5 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </div>
                        </span>
                    ))
                )}
                <div className="ml-auto text-slate-400 px-1">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {options.length === 0 ? (
                            <div className="py-8 text-center">
                                <Tag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-xs font-bold text-slate-400">Sem opções disponíveis</p>
                            </div>
                        ) : (
                            options.map(option => {
                                const isSelected = selectedValues.includes(option);
                                return (
                                    <div
                                        key={option}
                                        onClick={() => onToggle(field, option)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                                : 'hover:bg-slate-50 text-slate-600 font-semibold'
                                        }`}
                                    >
                                        <span className="text-sm">{option || '(Vazio)'}</span>
                                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

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
                            {(Object.keys(filterOptions) as Array<keyof FilterState>).map((field) => (
                                <FilterDropdown
                                    key={field}
                                    field={field}
                                    options={filterOptions[field]}
                                    selectedValues={pendingFilters[field]}
                                    isMulti={!['priority', 'minimum'].includes(field)}
                                    onToggle={(f, v) => {
                                        const isMulti = !['priority', 'minimum'].includes(f);
                                        setPendingFilters(prev => {
                                            const current = [...prev[f]];
                                            const index = current.indexOf(v);
                                            
                                            if (isMulti) {
                                                if (index > -1) current.splice(index, 1);
                                                else current.push(v);
                                            } else {
                                                if (index > -1) return { ...prev, [f]: [] };
                                                else return { ...prev, [f]: [v] };
                                            }
                                            return { ...prev, [f]: current };
                                        });
                                    }}
                                    onClear={(f) => setPendingFilters(prev => ({ ...prev, [f]: [] }))}
                                />
                            ))}
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
