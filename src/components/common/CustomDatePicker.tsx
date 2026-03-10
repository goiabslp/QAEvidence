import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  value, 
  onChange, 
  placeholder = "Selecione",
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize calendar view state based on value or today
  const getInitialDate = () => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState(getInitialDate());

  // Update view if value changes externally
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      const newDate = new Date(y, m - 1, d);
      // Only update view if the month/year is different to avoid jumping
      if (newDate.getMonth() !== viewDate.getMonth() || newDate.getFullYear() !== viewDate.getFullYear()) {
        setViewDate(newDate);
      }
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    // Construct YYYY-MM-DD
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Calendar Grid Generation
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
  }
  
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    const isSelected = value === dateStr;
    const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

    days.push(
      <button
        key={d}
        type="button"
        onClick={(e) => { e.stopPropagation(); handleDateClick(d); }}
        className={`h-9 w-9 rounded-full text-xs font-semibold flex items-center justify-center transition-all
          ${isSelected 
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
            : isToday 
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
              : 'text-slate-700 hover:bg-slate-100'
          }
        `}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
           w-full rounded-lg border bg-white text-slate-700 px-3 py-2.5 text-sm 
           flex items-center gap-2 cursor-pointer transition-all shadow-sm
           ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-300 hover:border-indigo-300'}
           ${className}
        `}
      >
        <CalendarIcon className={`w-4 h-4 ${value ? 'text-indigo-600' : 'text-slate-400'}`} />
        <span className={value ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 animate-fade-in">
           {/* Header */}
           <div className="flex items-center justify-between mb-4">
             <button 
                type="button" 
                onClick={handlePrevMonth} 
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
             >
               <ChevronLeft className="w-4 h-4" />
             </button>
             <span className="text-sm font-bold text-slate-800 capitalize">
               {MONTHS[month]} {year}
             </span>
             <button 
                type="button" 
                onClick={handleNextMonth} 
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
             >
               <ChevronRight className="w-4 h-4" />
             </button>
           </div>

           {/* Weekdays */}
           <div className="grid grid-cols-7 mb-2">
             {WEEKDAYS.map(day => (
               <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
                 {day}
               </div>
             ))}
           </div>

           {/* Days */}
           <div className="grid grid-cols-7 gap-1">
             {days}
           </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
