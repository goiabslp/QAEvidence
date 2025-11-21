
import React, { useState, useMemo } from 'react';
import { EvidenceItem, TestStatus } from '../types';
import { STATUS_CONFIG, SEVERITY_COLORS } from '../constants';
import { Trash2, ExternalLink, Calendar, User, Tag, Monitor, ChevronDown, ChevronUp, Plus, Layers, FileText, ChevronRight, Pencil, ListChecks, Image as ImageIcon } from 'lucide-react';

interface EvidenceListProps {
  evidences: EvidenceItem[];
  onDelete: (id: string) => void;
  onAddCase?: (id: string) => void;
  onEditCase?: (id: string) => void;
}

// Interface auxiliar para o agrupamento
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

const EvidenceList: React.FC<EvidenceListProps> = ({ evidences, onDelete, onAddCase, onEditCase }) => {
  // Controla quais Scenarios (Grupos) estão abertos
  const [expandedScenarios, setExpandedScenarios] = useState<Set<number>>(new Set());
  
  // Controla quais Casos (Detalhes) estão abertos
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  // Agrupamento inteligente das evidências
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

    // Ordena os casos dentro dos grupos
    groups.forEach(g => {
      if (g.type === 'scenario') {
        g.items.sort((a, b) => (a.testCaseDetails?.caseNumber || 0) - (b.testCaseDetails?.caseNumber || 0));
      }
    });

    return groups;
  }, [evidences]);

  const toggleScenario = (scenarioNum: number) => {
    const newSet = new Set(expandedScenarios);
    if (newSet.has(scenarioNum)) {
      newSet.delete(scenarioNum);
    } else {
      newSet.add(scenarioNum);
    }
    setExpandedScenarios(newSet);
  };

  const toggleCaseDetails = (id: string) => {
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
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <Layers className="w-12 h-12" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma evidência registrada</h3>
        <p className="mt-1 text-sm text-gray-500">Preencha o formulário ou use o Assistente de Cenários.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groupedEvidences.map((group, index) => {
        
        // --- RENDERIZAÇÃO DE CENÁRIO AGRUPADO (CASCATA) ---
        if (group.type === 'scenario') {
          const isScenarioOpen = expandedScenarios.has(group.scenarioNumber);
          const firstItem = group.items[0]; // Usado para pegar infos gerais do ticket
          
          return (
            <div key={`scenario-${group.scenarioNumber}`} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              
              {/* Header do Cenário (Pai) */}
              <div 
                className="bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer border-b border-gray-100 gap-4"
                onClick={() => toggleScenario(group.scenarioNumber)}
              >
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg mt-1">
                    <Layers className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    {/* Título Padronizado */}
                    <h3 className="text-base font-bold text-gray-900">
                      Cenário de Teste #{group.scenarioNumber}
                    </h3>
                    
                    {/* IDs em forma de TAG */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* Contexto da Tela como primeira tag/label */}
                        <span className="inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 mr-1">
                           <Monitor className="w-3 h-3 mr-1.5" />
                           {group.screen}
                        </span>

                        {/* Lista de IDs dos casos */}
                        {group.items.map((item) => (
                            <span 
                                key={item.id} 
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border shadow-sm ${
                                    item.status === TestStatus.FAIL 
                                    ? 'bg-red-50 text-red-700 border-red-100' 
                                    : 'bg-white text-gray-600 border-gray-200'
                                }`}
                                title={`Caso ${item.testCaseDetails?.caseNumber}: ${item.testCaseDetails?.objective}`}
                            >
                                {item.testCaseDetails?.caseId}
                            </span>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pl-11 sm:pl-0">
                  {onAddCase && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Usa o ID do primeiro item como referência para clonar infos
                        onAddCase(firstItem.id);
                      }}
                      className="flex items-center gap-1.5 text-xs bg-white hover:bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all shadow-sm font-medium mr-2 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      Novo Caso
                    </button>
                  )}
                  <div className={`transform transition-transform duration-200 text-gray-400 ${isScenarioOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Lista de Casos (Filhos) - Cascata */}
              {isScenarioOpen && (
                <div className="bg-white divide-y divide-gray-100 border-t border-gray-100 animate-slide-down">
                  {group.items.map((evidence) => {
                    const isCaseOpen = expandedCases.has(evidence.id);
                    const { testCaseDetails, ticketInfo } = evidence;
                    const hasSteps = testCaseDetails?.steps && testCaseDetails.steps.length > 0;
                    
                    return (
                      <div key={evidence.id} className="group transition-colors hover:bg-gray-50/50">
                        {/* Linha de Resumo do Caso */}
                        <div 
                          className="px-4 py-3 flex items-center gap-4 cursor-pointer"
                          onClick={() => toggleCaseDetails(evidence.id)}
                        >
                           {/* Ícone de Seta para Expandir Detalhes */}
                           <div className={`text-gray-300 transition-transform duration-200 ${isCaseOpen ? 'rotate-90 text-indigo-500' : ''}`}>
                              <ChevronRight className="w-4 h-4" />
                           </div>

                           {/* Badge Status */}
                           <div 
                             className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[evidence.status].color.split(' ')[0].replace('bg-', 'bg-')}`}
                             title={STATUS_CONFIG[evidence.status].label}
                           ></div>

                           {/* Info do Caso */}
                           <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                              <div className="md:col-span-3 flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                  Caso {testCaseDetails?.caseNumber}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">{testCaseDetails?.caseId}</span>
                                {hasSteps && (
                                    <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full ml-1" title={`${testCaseDetails?.steps?.length} passos registrados`}>
                                        <ListChecks className="w-3 h-3" /> {testCaseDetails?.steps?.length}
                                    </span>
                                )}
                              </div>

                              <div className="md:col-span-7">
                                <p className="text-sm text-gray-700 truncate" title={testCaseDetails?.objective}>
                                  {testCaseDetails?.objective || 'Sem objetivo definido'}
                                </p>
                              </div>

                              <div className="md:col-span-2 flex justify-end items-center gap-2">
                                {onEditCase && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditCase(evidence.id); }}
                                        className="text-gray-300 hover:text-blue-500 p-1.5 rounded-md hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Editar Caso"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onDelete(evidence.id); }}
                                  className="text-gray-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Excluir Caso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                           </div>
                        </div>

                        {/* Detalhes Expandidos do Caso */}
                        {isCaseOpen && (
                          <div className="px-10 pb-6 pt-2 bg-gray-50/30 text-sm animate-fade-in border-b border-gray-100">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-3">
                                  <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pré-Requisito</span>
                                    <p className="text-gray-800 bg-white p-2 rounded border border-gray-200 mt-1">{testCaseDetails?.preRequisite || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Condição</span>
                                    <p className="text-gray-800 bg-white p-2 rounded border border-gray-200 mt-1">{testCaseDetails?.condition || '-'}</p>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Resultado Esperado</span>
                                    <p className="text-blue-900 bg-blue-50 p-2 rounded border border-blue-100 mt-1">{testCaseDetails?.expectedResult || '-'}</p>
                                  </div>
                                  <div className="flex items-center justify-between pt-2">
                                     <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <User className="w-3 h-3" /> {ticketInfo.analyst}
                                        <span className="mx-1">•</span>
                                        <Calendar className="w-3 h-3" /> {new Date(ticketInfo.evidenceDate).toLocaleDateString('pt-BR')}
                                     </div>
                                  </div>
                                </div>
                             </div>

                             {/* RENDERIZAÇÃO DOS PASSOS (TIMELINE) */}
                             {hasSteps && (
                                 <div className="mt-4 border-t border-gray-200 pt-4">
                                     <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2 mb-3">
                                         <ListChecks className="w-4 h-4" /> Execução Detalhada
                                     </h4>
                                     <div className="space-y-4">
                                         {testCaseDetails?.steps?.map((step, idx) => (
                                             <div key={idx} className="flex gap-4 relative">
                                                 {/* Linha vertical conectora (Timeline) */}
                                                 {idx !== (testCaseDetails.steps?.length || 0) - 1 && (
                                                     <div className="absolute left-[15px] top-8 bottom-[-16px] w-0.5 bg-gray-200"></div>
                                                 )}
                                                 
                                                 <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm z-10">
                                                     {step.stepNumber}
                                                 </div>
                                                 
                                                 <div className="flex-1 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                     <p className="text-gray-800 mb-2">{step.description || <span className="text-gray-400 italic">Sem descrição</span>}</p>
                                                     {step.imageUrl && (
                                                         <div className="relative group w-fit">
                                                            <img 
                                                                src={step.imageUrl} 
                                                                alt={`Passo ${step.stepNumber}`} 
                                                                className="h-32 w-auto object-contain rounded border border-gray-200 bg-gray-50 cursor-zoom-in"
                                                                onClick={() => window.open(step.imageUrl || '', '_blank')}
                                                            />
                                                            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                <ImageIcon className="w-3 h-3 inline mr-1" />
                                                                Clique para ampliar
                                                            </div>
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

        // --- RENDERIZAÇÃO DE CARD MANUAL (LEGADO/FOTO) ---
        const { item: evidence } = group;
        const { ticketInfo } = evidence;
        const StatusIcon = STATUS_CONFIG[evidence.status].icon;

        return (
          <div key={evidence.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col md:flex-row overflow-hidden">
             {/* Imagem lateral no desktop */}
            <div className="relative h-48 md:h-auto md:w-1/3 bg-gray-100 group">
              {evidence.imageUrl ? (
                <img 
                  src={evidence.imageUrl} 
                  alt={evidence.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-gray-50 flex-col gap-2">
                  <FileText className="w-8 h-8 opacity-20" />
                  <span>Evidência Manual</span>
                </div>
              )}
              
              {evidence.imageUrl && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <a 
                    href={evidence.imageUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="h-5 w-5 text-gray-700" />
                  </a>
                </div>
              )}
              <div className="absolute top-2 left-2">
                  <span className="font-mono font-bold bg-white/90 backdrop-blur px-1.5 py-0.5 rounded text-xs text-gray-800 shadow-sm">
                    {ticketInfo.ticketId}
                  </span>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                 <div>
                     <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider truncate max-w-[200px]" title={ticketInfo.ticketTitle}>
                    {ticketInfo.ticketTitle}
                    </p>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1" title={evidence.title}>
                        {evidence.title}
                    </h3>
                 </div>
                 <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold shadow-sm ${STATUS_CONFIG[evidence.status].color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {STATUS_CONFIG[evidence.status].label}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[evidence.severity]}`}>
                  Severity: {evidence.severity}
                </span>
                {ticketInfo.environment && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    <Tag className="w-3 h-3 mr-1" />
                    {ticketInfo.environment}
                    </span>
                )}
              </div>

              <div className="text-sm text-gray-600 mb-4 flex-1">
                 <p className="line-clamp-2">{evidence.description}</p>
                 {ticketInfo.solution && (
                    <p className="mt-2 text-xs text-green-700 bg-green-50 p-1.5 rounded border border-green-100 line-clamp-1">
                        <strong>Solução:</strong> {ticketInfo.solution}
                    </p>
                 )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                <div className="flex items-center text-xs text-gray-400">
                   <User className="w-3 h-3 mr-1" /> {ticketInfo.analyst}
                   <span className="mx-2">•</span>
                   <Calendar className="w-3 h-3 mr-1" /> {new Date(ticketInfo.evidenceDate || evidence.timestamp).toLocaleDateString('pt-BR')}
                </div>
                <button 
                  onClick={() => onDelete(evidence.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EvidenceList;
