import { TestStatus, Severity } from './types';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle } from 'lucide-react';

export const STATUS_CONFIG = {
  [TestStatus.PASS]: {
    label: 'Aprovado',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2
  },
  [TestStatus.FAIL]: {
    label: 'Falhou',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle
  },
  [TestStatus.BLOCKED]: {
    label: 'Bloqueado',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertCircle
  },
  [TestStatus.SKIPPED]: {
    label: 'Pulado',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: MinusCircle
  }
};

export const SEVERITY_COLORS = {
  [Severity.LOW]: 'text-blue-600 bg-blue-50',
  [Severity.MEDIUM]: 'text-yellow-600 bg-yellow-50',
  [Severity.HIGH]: 'text-orange-600 bg-orange-50',
  [Severity.CRITICAL]: 'text-red-600 bg-red-50'
};