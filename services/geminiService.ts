import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, Severity } from "../types";

// Initialize the client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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