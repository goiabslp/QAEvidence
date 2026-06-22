import React from 'react';

/**
 * Formata um texto contendo cenários de teste Gherkin, deixando os prefixos
 * (DADO, QUANDO, E, ENTÃO, ENTAO, CENARIO, CENÁRIO) em negrito.
 * Preserva as quebras de linha substituindo \n por elementos <br />.
 */
export const formatGherkin = (text: string | undefined | null): React.ReactNode => {
  if (!text) return '-';
  
  const lines = text.split('\n');
  return lines.map((line, index) => {
    // Regex para identificar a primeira palavra de cada linha (ignorando espaços, asteriscos e dois-pontos opcionais)
    const match = line.match(/^(\s*)(\*\*)?([a-zA-Z0-9áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\-]+)(\*\*)?(?:(?:\s*:\s*)|(?:\s+)|$)(.*)$/i);
    
    if (match) {
      const [, spaces, , keyword, , rest] = match;
      
      let cleanedRest = (rest || '').trim();
      if (cleanedRest.toLowerCase().startsWith('eu ')) {
        cleanedRest = cleanedRest.substring(3).trim();
      }
      
      if (cleanedRest.length > 0) {
        cleanedRest = cleanedRest.charAt(0).toUpperCase() + cleanedRest.slice(1);
      }
      
      let normalizedKeyword = keyword.toUpperCase();
      if (normalizedKeyword === 'ENTAO') normalizedKeyword = 'ENTÃO';
      if (normalizedKeyword === 'CENARIO') normalizedKeyword = 'CENÁRIO';
      
      return (
        <React.Fragment key={index}>
          {spaces}
          <span className="inline-block bg-blue-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-md mr-1.5 align-middle select-none uppercase tracking-wide">
            {normalizedKeyword}
          </span>
          {cleanedRest}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      );
    }
    
    return (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};
