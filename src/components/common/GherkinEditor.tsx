import React, { useState, useRef, useEffect } from 'react';

// Conjunto de palavras-chave oficiais do Gherkin (case-insensitive)
const GHERKIN_KEYWORDS = new Set([
  'DADO', 'QUANDO', 'E', 'ENTÃO', 'ENTAO', 'CENÁRIO', 'CENARIO',
  'GIVEN', 'WHEN', 'THEN', 'AND', 'SCENARIO'
]);

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Sincroniza o scroll do textarea com o backdrop
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    handleScroll();
  }, [value]);

  const minHeight = rows ? `${rows * 20 + 20}px` : 'auto';

  // Formata o Gherkin para o editor mantendo a mesma quantidade de caracteres e posições
  const formatGherkinForEditor = (text: string): React.ReactNode => {
    if (!text) return '';
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Regex para identificar a primeira palavra de cada linha (ignorando espaços, asteriscos e dois-pontos opcionais)
      const match = line.match(/^(\s*)(\*\*)?([a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ-]+)(\*\*)?(?:(?:\s*:\s*)|(?:\s+)|$)(.*)$/i);
      
      if (match) {
        const [, spaces, asterisksLeft, keyword, asterisksRight, rest] = match;
        const upperKeyword = keyword.toUpperCase();
        
        if (GHERKIN_KEYWORDS.has(upperKeyword)) {
          let normalizedKeyword = upperKeyword;
          if (normalizedKeyword === 'ENTAO') normalizedKeyword = 'ENTÃO';
          if (normalizedKeyword === 'CENARIO') normalizedKeyword = 'CENÁRIO';
          
          return (
            <React.Fragment key={index}>
              {spaces}
              {asterisksLeft && <span className="text-transparent select-none">**</span>}
              <span className="inline-block bg-blue-600 text-white font-extrabold text-[12px] px-1 py-0.5 rounded mr-1 align-baseline select-none uppercase tracking-wide">
                {normalizedKeyword}
              </span>
              {asterisksRight && <span className="text-transparent select-none">**</span>}
              {rest}
              {index < lines.length - 1 && '\n'}
            </React.Fragment>
          );
        }
      }
      
      return (
        <React.Fragment key={index}>
          {line}
          {index < lines.length - 1 && '\n'}
        </React.Fragment>
      );
    });
  };

  // Limpa classes de padding e texto para aplicar no container
  const wrapperClassName = className
    .replace(/\bpx-\S+/g, '')
    .replace(/\bpy-\S+/g, '')
    .replace(/\bp-\S+/g, '')
    .replace(/\btext-slate-700\b/g, '')
    .replace(/\btext-sm\b/g, '')
    .replace(/\bfocus:ring-\S+/g, '')
    .replace(/\bfocus:border-\S+/g, '')
    + " relative overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500";

  const sharedStyles: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    lineHeight: '20px',
    padding: '10px 12px',
    margin: 0,
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
  };

  return (
    <div 
      className={wrapperClassName} 
      style={{ minHeight }}
    >
      {/* Visual Layer (Backdrop) */}
      <div
        ref={backdropRef}
        className="absolute inset-0 overflow-y-auto whitespace-pre-wrap break-words text-slate-700 pointer-events-none select-none bg-white"
        style={{
          ...sharedStyles,
          zIndex: 1,
        }}
      >
        {value.trim() ? (
          formatGherkinForEditor(value)
        ) : (
          <span className="text-slate-400 select-none pointer-events-none">
            {placeholder}
          </span>
        )}
      </div>

      {/* Editing Layer (Textarea) */}
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        className="absolute inset-0 overflow-y-auto bg-transparent text-transparent caret-slate-700 resize-none selection:bg-indigo-500/20"
        placeholder={value ? '' : placeholder}
        style={{
          ...sharedStyles,
          zIndex: 2,
        }}
      />
    </div>
  );
};

export default GherkinEditor;
