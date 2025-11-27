

import { TestStatus, Severity, TicketPriority, TicketStatus } from './types';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle, Clock, ArrowDown, ArrowRight, ArrowUp, Play, Ban, CheckCheck } from 'lucide-react';

export const STATUS_CONFIG = {
  [TestStatus.PASS]: {
    label: 'Sucesso',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2
  },
  [TestStatus.FAIL]: {
    label: 'Falha',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle
  },
  [TestStatus.BLOCKED]: {
    label: 'Impedimento',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertCircle
  },
  [TestStatus.SKIPPED]: {
    label: 'Pendente',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Clock
  },
  [TestStatus.PENDING]: {
    label: 'Pendente',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: Clock
  }
};

export const SEVERITY_COLORS = {
  [Severity.LOW]: 'text-blue-600 bg-blue-50',
  [Severity.MEDIUM]: 'text-yellow-600 bg-yellow-50',
  [Severity.HIGH]: 'text-orange-600 bg-orange-50',
  [Severity.CRITICAL]: 'text-red-600 bg-red-50'
};

export const PRIORITY_CONFIG = {
  [TicketPriority.LOW]: {
    label: 'Baixa',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: ArrowDown
  },
  [TicketPriority.MEDIUM]: {
    label: 'Média',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', // Green as requested
    icon: ArrowRight
  },
  [TicketPriority.HIGH]: {
    label: 'Alta',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: ArrowUp
  }
};

export const TICKET_STATUS_CONFIG = {
  [TicketStatus.PENDING]: {
    label: 'Pendente',
    color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200', // Azul
    icon: Clock
  },
  [TicketStatus.IN_PROGRESS]: {
    label: 'Em andamento',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200', // Amarelo
    icon: Play
  },
  [TicketStatus.BLOCKED]: {
    label: 'Impedimento',
    color: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200', // Laranja
    icon: AlertCircle
  },
  [TicketStatus.CANCELLED]: {
    label: 'Cancelado',
    color: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200', // Cinza
    icon: Ban
  },
  [TicketStatus.FINISHED]: {
    label: 'Finalizado',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200', // Verde
    icon: CheckCheck
  }
};