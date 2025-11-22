
export enum TestStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  BLOCKED = 'BLOCKED',
  SKIPPED = 'SKIPPED',
  PENDING = 'PENDING'
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  acronym: string; // 3 letters
  name: string;
  password: string; // Simple storage for simulation
  role: UserRole;
  isActive?: boolean; // Control access
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
  result: 'Sucesso' | 'Falha' | 'Impedimento' | 'Pendente';
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
  createdBy: string; // User acronym
}

export interface ArchivedTicket {
  id: string;
  ticketInfo: TicketInfo;
  items: EvidenceItem[];
  archivedAt: number;
  createdBy: string; // User acronym
}

export interface AIAnalysisResult {
  description: string;
  suggestedSeverity: Severity;
  potentialBugs: string[];
}