import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, Severity } from "../types";

// Initialize the client with the API key from environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY não está definida no arquivo .env");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key" });

/**
 * Converts a File object to a Base64 string suitable for the Gemini API.
 */
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeScreenshot = async (file: File, context?: string): Promise<AIAnalysisResult> => {
  try {
    const base64Data = await fileToGenerativePart(file);

    const prompt = `
      Você é um Engenheiro de QA Sênior especialista. Analise esta captura de tela de evidência de teste.
      Contexto adicional do usuário: "${context || 'Nenhum contexto fornecido'}".
      
      1. Descreva o que está acontecendo na tela de forma técnica e objetiva.
      2. Sugira a severidade baseada em possíveis anomalias visuais ou no contexto (LOW, MEDIUM, HIGH, CRITICAL).
      3. Liste potenciais bugs visuais ou de usabilidade, se houver.
      
      Responda APENAS com JSON seguindo este schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "Descrição técnica detalhada da evidência."
            },
            suggestedSeverity: {
              type: Type.STRING,
              enum: [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL],
              description: "Severidade sugerida."
            },
            potentialBugs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de bugs potenciais identificados."
            }
          },
          required: ["description", "suggestedSeverity", "potentialBugs"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    
    throw new Error("Resposta vazia da IA");

  } catch (error) {
    console.error("Erro ao analisar evidência:", error);
    throw error;
  }
};

export interface AITestCaseResult {
  screen: string;
  objective: string;
  description: string;
  expectedResult: string;
}

export const generateTestCaseFromStory = async (story: string): Promise<AITestCaseResult> => {
  try {
    const prompt = `
Transforme o texto informado em cenário de teste no padrão Gherkin, extraindo as informações e separando conforme a estrutura abaixo.

Texto informado: "${story}"

Regras gerais de formatação Gherkin:
- Utilizar sempre caixa alta para os prefixos: CENÁRIO, DADO, QUANDO, ENTÃO e E;
- Sempre finalizar as linhas com ponto e vírgula (;);
- Sempre deixar uma linha em branco entre os blocos principais (ex: DADO e QUANDO);
- O texto deve ficar claro, objetivo e profissional;
- Corrigir automaticamente erros ortográficos do texto enviado;
- Organizar múltiplas ações utilizando 'E';
- Os prefixos (DADO, QUANDO, ENTÃO, E, CENÁRIO) devem ser sempre em NEGRITO (envoltos em asteriscos duplos, ex: **DADO**, **QUANDO**, **ENTÃO**, **E**, **CENÁRIO**) e NÃO devem conter o caractere de dois-pontos (:) após o prefixo.
- A frase que segue após o prefixo deve iniciar sempre com a primeira letra em maiúscula (ex: '**DADO** Acesso à tela...' em vez de '**DADO**: acesso à tela...').
- NUNCA utilize o pronome 'Eu' (ou 'Eu ' após os prefixos Gherkin DADO, QUANDO, E, ENTÃO). O texto deve começar diretamente com o verbo conjugado (ex: '**DADO** Acesso à tela...' em vez de '**DADO** Eu acesso à tela...'; '**E** Acesso à seção...' em vez de '**E** Eu acesso à seção...').

Com base nisso, gere um JSON com a seguinte estrutura estrita:
1. "screen": Nome da tela informada no texto. Se não for especificada uma tela, deduza ou deixe em branco.
2. "objective": Deve conter APENAS: "**CENÁRIO** Resumo do cenário;"
3. "description": Deve conter o contexto e ações (sem o pronome 'Eu' após o prefixo), exato nestes moldes:
"**DADO** Acesso à tela de clientes;

**QUANDO** Clico no botão de cadastrar;

**E** Preencho o campo nome;"
4. "expectedResult": Deve conter o resultado esperado (sem o pronome 'Eu' após o prefixo), exato nestes moldes:
"**ENTÃO** Visualizo o cadastro realizado com sucesso;"

Responda APENAS com JSON seguindo o schema configurado.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            screen: { type: Type.STRING },
            objective: { type: Type.STRING },
            description: { type: Type.STRING },
            expectedResult: { type: Type.STRING }
          },
          required: ["screen", "objective", "description", "expectedResult"]
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text) as AITestCaseResult;

      const cleanAndFormatGherkinText = (text: string | undefined | null): string => {
        if (!text) return "";
        return text.split('\n').map(line => {
          const regex = /^(\s*)(\*\*)?(DADO|QUANDO|E|ENTÃO|ENTAO|CENARIO|CENÁRIO)(\*\*)?(?:(?:\s*:\s*)|(?:\s+)|$)(.*)$/i;
          const match = line.match(regex);
          if (match) {
            const [, spaces, , keyword, , , rest] = match;
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
            return `${spaces}**${normalizedKeyword}**${cleanedRest ? ' ' + cleanedRest : ''}`;
          }
          return line;
        }).join('\n');
      };

      return {
        screen: parsed.screen || "",
        objective: cleanAndFormatGherkinText(parsed.objective || ""),
        description: cleanAndFormatGherkinText(parsed.description || ""),
        expectedResult: cleanAndFormatGherkinText(parsed.expectedResult || "")
      };
    }
    
    throw new Error("Resposta vazia da IA");
  } catch (error) {
    console.error("Erro ao gerar caso de teste via IA:", error);
    throw error;
  }
};