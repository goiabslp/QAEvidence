import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown, Tag } from 'lucide-react';

export interface ModernSelectOption {
  value: string;
  label: string;
  count?: number;
}

interface ModernSelectProps {
  value: string | string[];
  onChange: (value: string) => void;
  options: ModernSelectOption[] | string[];
  placeholder?: string;
  field?: string; // For semantic styling: 'priority', 'minimum', 'result', 'analyst'
  isMulti?: boolean;
  variant?: 'listing' | 'filter';
  onClear?: () => void;
}

const getSemanticStyle = (field: string, value: string) => {
  const cleanVal = String(value || '').toLowerCase();
  
  if (field === 'priority' || field === 'prioridade') {
    if (cleanVal.includes('alta')) return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
    if (cleanVal.includes('baixa')) return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    if (cleanVal.includes('média')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
  }
  
  if (field === 'minimum' || field === 'mínimo') {
    if (cleanVal === 'sim') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    if (cleanVal === 'não') return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
  }
  
  if (field === 'result' || field === 'resultado') {
    if (cleanVal === 'sucesso') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    if (cleanVal === 'erro') return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
    if (cleanVal === 'em andamento') return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    if (cleanVal === 'impedimento') return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
    if (cleanVal === 'pendente') return 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
  }

  if (field === 'analyst' || field === 'analista') {
    return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
  }
  
  return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
};

const ModernSelect: React.FC<ModernSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  field = '',
  isMulti = false,
  variant = 'listing',
  onClear
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: ModernSelectOption[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate position when opening
  useEffect(() => {
      if (isOpen && dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          // Approximate height of the dropdown menu (adjust if needed, or measure dynamically after first render)
          const menuHeight = 250; 
          const spaceBelow = windowHeight - rect.bottom;
          const spaceAbove = rect.top;

          if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
              setDirection('up');
          } else {
              setDirection('down');
          }
      }
  }, [isOpen]);

  const handleToggle = (optValue: string) => {
    onChange(optValue);
    if (!isMulti) setIsOpen(false);
  };

  const isListing = variant === 'listing';

  return (
    <div className={`relative ${isListing ? 'w-fit' : ''}`} ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 cursor-pointer transition-all ${
          isListing 
            ? `px-2 py-0.5 w-fit rounded border shadow-sm text-xs font-semibold ${selectedValues.length > 0 ? getSemanticStyle(field, selectedValues[0]) : 'bg-slate-50 text-slate-400 border-slate-200'}`
            : `w-full bg-white border-2 rounded-2xl p-2.5 min-h-[52px] ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-slate-300'}`
        }`}
      >
        {!isListing && selectedValues.length === 0 ? (
          <span className="text-sm font-semibold text-slate-400 pl-2">{placeholder}</span>
        ) : !isListing ? (
          <div className="flex flex-wrap gap-1.5 flex-1 items-center">
            {selectedValues.map(val => (
                <span 
                    key={val}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 animate-in zoom-in-95 duration-150 ${getSemanticStyle(field, val)}`}
                >
                    {normalizedOptions.find(o => o.value === val)?.label || val}
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(val);
                        }}
                        className="hover:bg-black/5 rounded-full p-0.5"
                    >
                        <X className="w-3 h-3" />
                    </div>
                </span>
            ))}
          </div>
        ) : (
          <span className="truncate flex-1">
            {normalizedOptions.find(o => o.value === selectedValues[0])?.label || selectedValues[0] || '--'}
          </span>
        )}
        
        <div className={`${isListing ? 'opacity-40' : 'text-slate-400 ml-auto px-1'}`}>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div 
            ref={menuRef}
            className={`absolute z-[9999] mt-2 mb-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden ${
                direction === 'up' 
                    ? 'bottom-full origin-bottom animate-in slide-in-from-bottom-2 fade-in' 
                    : 'top-full origin-top animate-in slide-in-from-top-2 fade-in'
            } duration-200 ${
                isListing ? 'left-0 w-48' : 'left-0 right-0'
            }`}
        >
          <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {normalizedOptions.length === 0 ? (

              <div className="py-4 text-center">
                <p className="text-xs font-bold text-slate-400">Sem opções</p>
              </div>
            ) : (
              normalizedOptions.map(option => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleToggle(option.value)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                        : 'hover:bg-slate-50 text-slate-600 font-semibold text-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                       <span className="text-sm">{option.label || '(Vazio)'}</span>
                       {option.count !== undefined && (
                         <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-bold">
                           {option.count}
                         </span>
                       )}
                    </div>
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

export default ModernSelect;
