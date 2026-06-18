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
    // Regex para identificar prefixos Gherkin no início da linha, ignorando espaços
    const match = line.match(/^(\s*)(DADO|QUANDO|E|ENTÃO|ENTAO|CENARIO|CENÁRIO)(:)?(.*)$/i);
    
    if (match) {
      const [, spaces, prefix, colon, rest] = match;
      return (
        <React.Fragment key={index}>
          {spaces}
          <strong>{prefix}{colon || ':'}</strong>
          {rest}
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
