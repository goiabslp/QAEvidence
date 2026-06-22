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
      // Regex para identificar a primeira palavra de cada linha mantendo o restante do texto inalterado
      const match = line.match(/^(\s*)(\*\*)?([a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ-]+)(\*\*)?(.*)$/i);
      
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
              <span 
                className="inline-block bg-blue-600 text-white font-bold select-none uppercase tracking-wide"
                style={{
                  fontSize: '14px',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  marginLeft: '-4px',
                  marginRight: '-4px',
                  borderRadius: '4px',
                  verticalAlign: 'baseline',
                  lineHeight: '20px',
                }}
              >
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

  const normalizeGherkinText = (text: string): string => {
    if (!text) return '';
    const lines = text.split('\n');
    const normalizedLines = lines.map(line => {
      // Regex para identificar DADO/dado no início da linha que não esteja seguido de "que"
      const match = line.match(/^(\s*)(\*\*)?(dado)(\*\*)?(?:\s*:\s*|\s+)(?!que\b)(.*)$/i);
      if (match) {
        const [, spaces, asterisksLeft, keyword, asterisksRight, rest] = match;
        return `${spaces}${asterisksLeft || ''}${keyword.toUpperCase()}${asterisksRight || ''} que ${rest}`;
      }
      return line;
    });
    return normalizedLines.join('\n');
  };

  const handleBlur = () => {
    const normalized = normalizeGherkinText(value);
    if (normalized !== value) {
      onChange(normalized);
    }
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
  };

  return (
    <div 
      className={wrapperClassName} 
      style={{ minHeight }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .gherkin-editor-textarea::selection {
          background-color: rgba(99, 102, 241, 0.25) !important;
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
        }
      `}} />
      
      {/* Visual Layer (Backdrop) - Define a altura do container */}
      <div
        ref={backdropRef}
        className="relative w-full whitespace-pre-wrap break-words text-slate-700 bg-white"
        style={{
          ...sharedStyles,
          minHeight,
          height: 'auto',
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

      {/* Editing Layer (Textarea) - Ocupa 100% da altura calculada pelo backdrop */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-slate-700 resize-none gherkin-editor-textarea overflow-hidden"
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
