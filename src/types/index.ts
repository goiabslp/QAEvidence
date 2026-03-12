
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

export enum TicketStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED',
  FINISHED = 'FINISHED'
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
  isActive?: boolean; // Control access
  showEasterEgg?: boolean; // Control Bug appearance
  testColumnSettings?: TestColumnSettings; // Configurações de coluna de teste
  testFilters?: FilterState; // Filtros fixos da tela de testes
  dailyGoal?: number; // Meta diária de testes
  isDailyGoalAuto?: boolean; // Se a meta diária se aplica automaticamente
  lastActiveDate?: string; // Data do último login/uso do sistema
}

export interface TicketInfo {
  sprint: string;
  ticketId: string;
  isImprovement?: boolean; // Novo campo para identificar melhoria
  priority: TicketPriority;
  errorOrigin?: string; // Novo campo: Origem do Erro
  ticketStatus?: TicketStatus; // Novo campo
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
  // Campos de Impedimento
  blockageReason?: string;
  blockageImageUrls?: string[];
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
  observation?: string; // Novo campo: Observação
  createdBy: string;
  attachments?: string[]; // List of base64 images
}

// Enum keys para as colunas de teste
export type TestColumnKey = 
  | 'stepsText' | 'browser' | 'bank' | 'backoffice' | 'mobile' 
  | 'analyst' | 'automated' | 'bcsCode' | 'useCase' | 'minimum' 
  | 'priority' | 'testId' | 'module' | 'objective' | 'estimatedTime' 
  | 'prerequisite' | 'description' | 'acceptanceCriteria' | 'result' 
  | 'errorStatus' | 'observation' | 'gap';

export type TestColumnSettings = Record<TestColumnKey, boolean> & {
  order?: TestColumnKey[];
};

export const DEFAULT_COLUMN_ORDER: TestColumnKey[] = [
  'testId', 'bank', 'backoffice', 'module', 'analyst', 'priority', 
  'browser', 'mobile', 'automated', 'bcsCode', 'useCase', 
  'minimum', 'estimatedTime', 'result', 'errorStatus', 'gap'
];

export const DEFAULT_COLUMN_SETTINGS: TestColumnSettings = {
  stepsText: false,
  browser: true,
  bank: true,
  backoffice: true,
  mobile: true,
  analyst: true,
  automated: false,
  bcsCode: false,
  useCase: false,
  minimum: false,
  priority: true,
  testId: true,
  module: true,
  objective: true,
  estimatedTime: false,
  prerequisite: true,
  description: true,
  acceptanceCriteria: true,
  result: false,
  errorStatus: false,
  observation: false,
  gap: false,
  order: DEFAULT_COLUMN_ORDER
};

// Interface para armazenar os casos de teste importados da planilha Excel
export interface ExcelTestRecord {
  id: string; // Auto-generated UUID
  stepsText: string; // A -> Replicar a redação para o caso
  browser: string; // B -> Navegador
  bank: string; // C -> Banco
  backoffice: string; // D -> Backoffice
  mobile: string; // E -> Mobile
  analyst: string; // F -> Analista
  automated: string; // G -> Automatizado
  bcsCode: string; // H -> Cód BCSChamados
  useCase: string; // I -> Use Case
  minimum: string; // J -> Minimo
  priority: string; // K -> Prioridade
  testId: string; // L -> Teste ID
  module: string; // M -> Módulo
  objective: string; // N -> Objetivo
  estimatedTime: string; // O -> Tempo estimado
  prerequisite: string; // P -> Pré-requisito
  description: string; // Q -> Descrição
  acceptanceCriteria: string; // R -> Critérios de Aceitação
  result: string; // S -> Resultado
  errorStatus: string; // T -> Status Erro
  observation: string; // U -> Observação
  gap: string; // V -> GAP
  created_at?: string;
  updated_at?: string;
}
export interface FilterState {
  backoffice: string[];
  priority: string[];
  minimum: string[];
  module: string[];
  useCase: string[];
  analyst: string[];
  result: string[];
}

export const INITIAL_FILTER_STATE: FilterState = {
  backoffice: [],
  priority: [],
  minimum: [],
  module: [],
  useCase: [],
  analyst: [],
  result: []
};

export interface StructuredObservation {
  text: string;
  userAcronym: string;
  userName: string;
  timestamp: string;
}
