

import React, { useState, useMemo } from 'react';
import { EvidenceItem, TestStatus, TicketPriority } from '../types';
import { STATUS_CONFIG, SEVERITY_COLORS, PRIORITY_CONFIG } from '../constants';
import { Trash2, ExternalLink, Calendar, User, Tag, Monitor, ChevronDown, ChevronUp, Plus, Layers, FileText, ChevronRight, Pencil, ListChecks, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface EvidenceListProps {
  evidences: EvidenceItem[];
  onDelete: (id: string) => void;
  onAddCase?: (id: string) => void;
  onEditCase?: (id: string) => void;
  onDeleteScenario?: (scenarioNum: number) => void;
  readOnly?: boolean;
}

interface ScenarioGroup {
  type: 'scenario';
  scenarioNumber: number;
  screen: string;
  items: EvidenceItem[];
}

interface ManualItem {
  type: 'manual';
  item: EvidenceItem;
}

type GroupedItem = ScenarioGroup | ManualItem;

const EvidenceList: React.FC<EvidenceListProps> = ({ evidences, onDelete, onAddCase, onEditCase, onDeleteScenario, readOnly = false }) => {
  const [expandedScenarios, setExpandedScenarios] = useState<Set<number>>(new Set());
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  const groupedEvidences = useMemo(() => {
    const groups: GroupedItem[] = [];
    const scenarioMap = new Map<number, ScenarioGroup>();

    evidences.forEach(ev => {
      if (ev.testCaseDetails) {
        const sNum = ev.testCaseDetails.scenarioNumber;
        if (!scenarioMap.has(sNum)) {
          const newGroup: ScenarioGroup = {
            type: 'scenario',
            scenarioNumber: sNum,
            screen: ev.testCaseDetails.screen,
            items: []
          };
          scenarioMap.set(sNum, newGroup);
          groups.push(newGroup);
        }
        scenarioMap.get(sNum)?.items.push(ev);
      } else {
        groups.push({ type: 'manual', item: ev });
      }
    });

    groups.sort((a, b) => {
        if (a.type === 'scenario' && b.type === 'scenario') {
            return a.scenarioNumber - b.scenarioNumber;
        }
        if (a.type === 'scenario') return -1;
        if (b.type === 'scenario') return 1;
        return 0;
    });

    groups.forEach(g => {
      if (g.type === 'scenario') {
        g.items.sort((a, b) => (a.testCaseDetails?.caseNumber || 0) - (b.testCaseDetails?.caseNumber || 0));
      }
    });

    return groups;
  }, [evidences]);

  const toggleScenario = (scenarioNum: number) => {
    if (readOnly) return;
    const newSet = new Set(expandedScenarios);
    if (newSet.has(scenarioNum)) {
      newSet.delete(scenarioNum);
    } else {
      newSet.add(scenarioNum);
    }
    setExpandedScenarios(newSet);
  };

  const toggleCaseDetails = (id: string) => {
    if (readOnly) return;
    const newSet = new Set(expandedCases);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedCases(newSet);
  };

  if (evidences.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <div className="mx-auto h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">Nenhuma evidência registrada</h3>
        <p className="mt-2 text-slate-500 max-w-sm mx-auto">Utilize o formulário acima para registrar casos de teste ou evidências manuais.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${readOnly ? 'gap-6' : 'gap-8'}`}>
      {groupedEvidences.map((group) => {
        
        if (group.type === 'scenario') {
          const isScenarioOpen = readOnly || expandedScenarios.has(group.scenarioNumber);
          const firstItem = group.items[0];
          const priority = firstItem.ticketInfo.priority || TicketPriority.MEDIUM;
          const PriorityConfig = PRIORITY_CONFIG[priority];
          
          return (
            <div key={`scenario-${group.scenarioNumber}`} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md page-break-avoid">
              
              {/* Header do Cenário */}
              <div 
                className={`bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer border-b border-slate-100 gap-4 relative group/header ${readOnly ? 'p-3' : 'p-5'}`}
                onClick={() => toggleScenario(group.scenarioNumber)}
              >
                <div className="flex items-start gap-4">
                  <div className={`bg-indigo-600 rounded-xl shadow-md shadow-indigo-200 mt-0.5 ${readOnly ? 'p-2' : 'p-2.5'}`}>
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900">
                            Cenário #{group.scenarioNumber}
                        </h3>
                        {/* PRIORITY TAG */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${PriorityConfig.color}`}>
                            {PriorityConfig.label}
                        </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 mr-1">
                           <Monitor className="w-3 h-3 mr-1.5 text-slate-400" />
                           {group.screen}
                        </span>

                        {group.items.map((item) => (
                            <span 
                                key={item.id} 
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border shadow-sm ${
                                    item.status === TestStatus.FAIL 
                                    ? 'bg-red-50 text-red-700 border-red-100' 
                                    : item.status === TestStatus.PENDING 
                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                            >
                                {item.testCaseDetails?.caseId}
                            </span>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Wrapper for Actions */}
                {!readOnly && (
                  <div className="flex items-center justify-end gap-3 pl-14 sm:pl-0 relative z-20">
                    {onAddCase && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddCase(firstItem.id);
                        }}
                        className="flex items-center gap-1.5 text-xs bg-white hover:bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all shadow-sm font-bold uppercase tracking-wide mr-2 relative z-50"
                        type="button"
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar Caso
                      </button>
                    )}
                    
                    {/* Toggle Chevron */}
                    <div className={`p-2 rounded-full hover:bg-slate-100 transition-all pointer-events-none ${isScenarioOpen ? 'bg-slate-100 rotate-180 text-indigo-600' : 'text-slate-400'}`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Casos */}
              {isScenarioOpen && (
                <div className={`bg-white divide-y divide-slate-100 ${readOnly ? '' : 'animate-slide-down'}`}>
                  {group.items.map((evidence) => {
                    const isCaseOpen = readOnly || expandedCases.has(evidence.id);
                    const { testCaseDetails, ticketInfo } = evidence;
                    const hasSteps = testCaseDetails?.steps && testCaseDetails.steps.length > 0;
                    const StatusConfig = STATUS_CONFIG[evidence.status];
                    const StatusIcon = StatusConfig.icon;
                    
                    return (
                      <div key={evidence.id} className="group transition-colors hover:bg-slate-50/50">
                        <div 
                          className={`px-5 flex items-center gap-3 cursor-pointer ${readOnly ? 'py-3' : 'py-4'}`}
                          onClick={() => toggleCaseDetails(evidence.id)}
                        >
                           <div className={`text-slate-300 transition-transform duration-200 flex-shrink-0 ${isCaseOpen ? 'rotate-90 text-indigo-500' : ''}`}>
                              <ChevronRight className="w-5 h-5" />
                           </div>

                           <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                              
                              {/* 1. CASO (Case Number) */}
                              <div className="sm:col-span-1 flex items-center justify-center sm:justify-start">
                                 <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                                    Caso <span className="text-slate-900 text-sm">#{testCaseDetails?.caseNumber}</span>
                                 </span>
                              </div>

                              {/* 2. STATUS BADGE */}
                              <div className="sm:col-span-2 flex justify-start">
                                  <span className={`w-full flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-bold border shadow-sm uppercase tracking-wide truncate ${StatusConfig.color}`}>
                                      <StatusIcon className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                      {StatusConfig.label}
                                   </span>
                              </div>

                              {/* 3. CASE ID */}
                              <div className="sm:col-span-2 flex justify-start">
                                <span className="w-full text-center font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 truncate" title="ID do Caso">
                                  {testCaseDetails?.caseId}
                                </span>
                              </div>

                              {/* 4. SCREEN & OBJECTIVE */}
                              <div className="sm:col-span-6 flex flex-col justify-center min-w-0">
                                 <div className="flex items-center gap-1.5 mb-0.5">
                                     <Monitor className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                     <span className="text-xs font-bold text-slate-700 truncate" title={`Tela: ${testCaseDetails?.screen}`}>
                                        {testCaseDetails?.screen || '-'}
                                     </span>
                                 </div>
                                 <div className="flex items-center gap-1.5 pl-4">
                                    <p className="text-xs text-slate-500 truncate" title={testCaseDetails?.objective}>
                                       {testCaseDetails?.objective || 'Sem objetivo'}
                                    </p>
                                 </div>
                              </div>

                              {/* ACTIONS */}
                              {!readOnly && (
                                <div className="sm:col-span-1 flex justify-end items-center gap-1">
                                    {hasSteps && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full mr-1 border border-slate-100" title={`${testCaseDetails?.steps?.length} passos`}>
                                            <ListChecks className="w-3 h-3" />
                                        </span>
                                    )}

                                    {onEditCase && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditCase(evidence.id); }}
                                            className="text-slate-500 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                            title="Editar Caso"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(evidence.id); }}
                                    className="text-slate-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                    title="Excluir Caso"
                                    >
                                    <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                              )}
                           </div>
                        </div>

                        {isCaseOpen && (
                          <div className={`px-12 pb-8 pt-2 bg-slate-50/30 text-sm border-b border-slate-100 ${readOnly ? '' : 'animate-fade-in'}`}>
                             {/* Failure Reason Display */}
                             {testCaseDetails?.failureReason && (testCaseDetails.result === 'Falha' || testCaseDetails.result === 'Impedimento') && (
                                <div className={`mb-6 p-4 rounded-xl border ${
                                    evidence.status === TestStatus.FAIL 
                                    ? 'bg-red-50 border-red-100 text-red-900' 
                                    : 'bg-amber-50 border-amber-100 text-amber-900'
                                }`}>
                                    <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Motivo do {testCaseDetails.result}
                                    </h4>
                                    <p className="leading-relaxed whitespace-pre-line font-medium">{testCaseDetails.failureReason}</p>
                                </div>
                             )}

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm break-inside-avoid">
                                <div className="space-y-4">
                                  <div>
                                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Pré-Requisito</span>
                                    <p className="text-slate-800 mt-1 whitespace-pre-line">{testCaseDetails?.preRequisite || '-'}</p>
                                  </div>
                                  <div className="w-full h-px bg-slate-100"></div>
                                  <div>
                                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Descrição do Teste</span>
                                    <p className="text-slate-800 mt-1 whitespace-pre-line">{testCaseDetails?.condition || '-'}</p>
                                  </div>
                                </div>

                                <div className="space-y-4 border-l border-slate-100 pl-8">
                                  <div>
                                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Resultado Esperado</span>
                                    <p className="text-indigo-900 bg-indigo-50/50 p-3 rounded-lg border border-indigo-50 mt-1 leading-relaxed">
                                        {testCaseDetails?.expectedResult || '-'}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between pt-2">
                                     <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticketInfo.analyst}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ticketInfo.evidenceDate).toLocaleDateString('pt-BR')}</span>
                                     </div>
                                  </div>
                                </div>
                             </div>

                             {hasSteps && (
                                 <div className="mt-6">
                                     <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2 mb-4">
                                         <ListChecks className="w-4 h-4" /> Timeline de Execução
                                     </h4>
                                     <div className="space-y-0 relative pl-2">
                                         <div className="absolute left-[27px] top-2 bottom-4 w-0.5 bg-slate-200"></div>
                                         
                                         {testCaseDetails?.steps?.map((step, idx) => (
                                             <div key={idx} className="flex gap-6 relative pb-6 last:pb-0 group/step break-inside-avoid">
                                                 <div className="flex-shrink-0 w-14 flex flex-col items-center relative z-10">
                                                     <div className="w-8 h-8 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm group-hover/step:border-indigo-400 group-hover/step:text-indigo-700 transition-colors">
                                                        {step.stepNumber}
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm group-hover/step:shadow-md transition-all">
                                                     <p className="text-slate-800 mb-3 leading-relaxed">{step.description || <span className="text-slate-400 italic">Sem descrição</span>}</p>
                                                     {step.imageUrl && (
                                                         <div className="relative group-img w-fit overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                                            <img 
                                                                src={step.imageUrl} 
                                                                alt={`Passo ${step.stepNumber}`} 
                                                                className="h-auto w-auto max-h-[500px] object-contain cursor-zoom-in"
                                                                onClick={() => !readOnly && window.open(step.imageUrl || '', '_blank')}
                                                            />
                                                            {!readOnly && (
                                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 opacity-0 group-hover-img:opacity-100 transition-opacity pointer-events-none flex items-center justify-center backdrop-blur-sm">
                                                                    <ImageIcon className="w-3 h-3 mr-1" />
                                                                    Ampliar Evidência
                                                                </div>
                                                            )}
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const { item: evidence } = group;
        const { ticketInfo } = evidence;
        const StatusIcon = STATUS_CONFIG[evidence.status].icon;
        const priority = ticketInfo.priority || TicketPriority.MEDIUM;
        const PriorityConfig = PRIORITY_CONFIG[priority];

        return (
          <div key={evidence.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row overflow-hidden group break-inside-avoid">
            <div className="relative h-48 md:h-auto md:w-1/3 bg-slate-100 overflow-hidden">
              {evidence.imageUrl ? (
                <img 
                  src={evidence.imageUrl} 
                  alt={evidence.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-3">
                  <div className="p-4 bg-white rounded-full shadow-sm">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <span className="text-sm font-medium">Evidência Manual</span>
                </div>
              )}
              
              <div className="absolute top-3 left-3">
                  <span className="font-mono font-bold bg-white/95 backdrop-blur px-2 py-1 rounded-lg text-xs text-slate-900 shadow-sm">
                    {ticketInfo.ticketId}
                  </span>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                 <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                            {ticketInfo.ticketTitle.split(' - ')[0] || 'TICKET'}
                        </span>
                        {/* PRIORITY TAG */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${PriorityConfig.color}`}>
                            {PriorityConfig.label}
                        </span>
                     </div>
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-700 transition-colors" title={evidence.title}>
                        {evidence.title}
                    </h3>
                 </div>
                 <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${STATUS_CONFIG[evidence.status].color} border-transparent`}>
                  <StatusIcon className="w-3 h-3 mr-1.5" />
                  {STATUS_CONFIG[evidence.status].label}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${SEVERITY_COLORS[evidence.severity]} border-transparent`}>
                  Severity: {evidence.severity}
                </span>
                {ticketInfo.environment && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <Tag className="w-3 h-3 mr-1.5 text-slate-400" />
                    {ticketInfo.environment}
                    </span>
                )}
              </div>

              <div className="text-sm text-slate-600 mb-6 flex-1 leading-relaxed">
                 <p className="line-clamp-2">{evidence.description}</p>
                 {ticketInfo.solution && (
                    <p className="mt-3 text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100 line-clamp-1">
                        <strong className="text-emerald-900">Solução:</strong> {ticketInfo.solution}
                    </p>
                 )}
              </div>

              {!readOnly && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    <div className="flex items-center text-xs text-slate-400 font-medium">
                        <User className="w-3 h-3 mr-1.5" /> {ticketInfo.analyst}
                        <span className="mx-3 text-slate-300">|</span>
                        <Calendar className="w-3 h-3 mr-1.5" /> {new Date(ticketInfo.evidenceDate || evidence.timestamp).toLocaleDateString('pt-BR')}
                    </div>
                    <button 
                    onClick={() => onDelete(evidence.id)}
                    className="text-slate-300 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                    title="Excluir Evidência"
                    >
                    <Trash2 className="h-4 w-4" />
                    </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EvidenceList;