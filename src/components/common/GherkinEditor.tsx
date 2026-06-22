import React, { useState, useRef, useEffect } from 'react';
import { formatGherkin } from '@/utils/gherkinUtils';

interface GherkinEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const GherkinEditor: React.FC<GherkinEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  rows = 3,
  className = '',
  onKeyDown
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calcula a altura mínima com base na quantidade de linhas (rows)
  // Cada linha tem cerca de 20px + 20px de padding interno (py-2.5 = 10px em cima e embaixo)
  const minHeight = rows ? `${rows * 20 + 20}px` : 'auto';

  // Quando entrar em modo de edição, foca o textarea automaticamente
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Opcional: mover cursor para o final do texto ao focar
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Se o clique for fora do componente, garante que desativa a edição
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Só sai do modo de edição se o novo elemento focado não estiver dentro do container do editor
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsEditing(false);
    }
  };

  const handleFocusDiv = () => {
    setIsEditing(true);
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full relative"
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          className={`${className} resize-none`}
          placeholder={placeholder}
          style={{ minHeight }}
        />
      ) : (
        <div
          tabIndex={0}
          onFocus={handleFocusDiv}
          onClick={handleFocusDiv}
          className={`${className} overflow-y-auto whitespace-pre-wrap break-words cursor-text select-text`}
          style={{ minHeight }}
        >
          {value.trim() ? (
            formatGherkin(value)
          ) : (
            <span className="text-slate-400 pointer-events-none select-none">
              {placeholder}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default GherkinEditor;
