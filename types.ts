

export enum TestStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  BLOCKED = 'BLOCKED',
  SKIPPED = 'SKIPPED'
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface TicketInfo {
  sprint: string;
  ticketId: string;
  ticketTitle: string;
  ticketSummary: string;
  clientSystem: string;
  requester: string;
  analyst: string;
  requestDate: string;
  environment: string;
  environmentVersion: string;
  evidenceDate: string;
  ticketDescription: string;
  solution: string;
}

export interface TestStep {
  stepNumber: number;
  description: string;
  imageUrl?: string | null;
}

// Nova interface para detalhes específicos do Caso de Teste
export interface TestCaseDetails {
  scenarioNumber: number;
  caseNumber: number;
  caseId: string; // Gerado automaticamente
  screen: string;
  result: 'Sucesso' | 'Fracasso' | 'Impedimento';
  objective: string;
  preRequisite: string;
  condition: string;
  expectedResult: string;
  failureReason?: string;
  steps?: TestStep[];
}

export interface EvidenceItem {
  id: string;
  // Campos da evidência técnica
  title: string; 
  description: string;
  imageUrl: string | null;
  status: TestStatus;
  severity: Severity;
  timestamp: number;
  // Novos campos do chamado
  ticketInfo: TicketInfo;
  // Campos opcionais do fluxo de Cenário de Teste
  testCaseDetails?: TestCaseDetails;
}

export interface ArchivedTicket {
  id: string;
  ticketInfo: TicketInfo;
  items: EvidenceItem[];
  archivedAt: number;
}

export interface AIAnalysisResult {
  description: string;
  suggestedSeverity: Severity;
  potentialBugs: string[];
}