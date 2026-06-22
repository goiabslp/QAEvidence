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
    // Regex para identificar prefixos Gherkin no início da linha, ignorando espaços e asteriscos e dois-pontos opcionais
    const match = line.match(/^(\s*)(\*\*)?(DADO|QUANDO|E|ENTÃO|ENTAO|CENARIO|CENÁRIO)(\*\*)?(?:(?:\s*:\s*)|(?:\s+)|$)(.*)$/i);
    
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
          <strong>{normalizedKeyword}</strong>
          {cleanedRest ? ` ${cleanedRest}` : ''}
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
