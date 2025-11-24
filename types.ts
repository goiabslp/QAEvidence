

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

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum BugStatus {
  PENDING = 'Pendente',
  OPEN_BUG = 'Abrir BUG',
  OPEN_IMPROVEMENT = 'Abrir Melhoria',
  IN_ANALYSIS = 'Em análise pelo DEV',
  AWAITING_FIX = 'Aguardando Correção',
  IN_TEST = 'Em teste',
  BLOCKED = 'Impedimento',
  DISCARDED = 'Descartado'
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
  priority: TicketPriority; // Novo campo
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

export type BugPriority = 'Alta' | 'Média' | 'Baixa';

export interface BugReport {
  id: string;
  summary: string;
  status: BugStatus;
  priority: BugPriority;
  screen: string;
  module: string;
  environment: string;
  date: string; // Local Brazil Date
  analyst: string; // "SIGLA - Nome"
  dev: string;
  preRequisites?: string[]; // Novo campo: Lista de pré-requisitos
  scenarioDescription: string;
  expectedResult: string;
  description: string; // Error Description
  devFeedback: string;
  createdBy: string;
  attachments?: string[]; // List of base64 images
}