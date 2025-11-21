
import React, { useState, useRef, useEffect } from 'react';
import { TestStatus, Severity, EvidenceItem, TicketInfo } from '../types';
import TestScenarioWizard from './TestScenarioWizard';
import { UploadCloud, Ticket, FileText, X, Check, Plus, ChevronDown, History, ChevronUp, Monitor, AlertCircle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { WizardTriggerContext } from '../App';

interface EvidenceFormProps {
  onSubmit: (evidence: Omit<EvidenceItem, 'id' | 'timestamp'>) => void;
  onWizardSave: (items: EvidenceItem[]) => void;
  wizardTrigger?: WizardTriggerContext | null;
  onClearTrigger?: () => void;
  evidences?: EvidenceItem[];
  initialTicketInfo?: TicketInfo | null; // Prop para carregar dados históricos
  onTicketInfoChange?: (info: TicketInfo) => void;
}

const PREDEFINED_ENVS = ['Trunk V11', 'Trunk V12', 'Tag V11', 'Tag V12', 'Protheus', 'SISJURI'];

const EvidenceForm: React.FC<EvidenceFormProps> = ({ 
  onSubmit, 
  onWizardSave, 
  wizardTrigger, 
  onClearTrigger, 
  evidences = [], 
  initialTicketInfo,
  onTicketInfoChange
}) => {
  // Estados do Chamado
  const [sprint, setSprint] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [ticketSummary, setTicketSummary] = useState(''); 
  const [clientSystem, setClientSystem] = useState('');
  const [ticketTitle, setTicketTitle] = useState('');
  const [requester, setRequester] = useState('');
  const [analyst, setAnalyst] = useState('');
  const [requestDate, setRequestDate] = useState('');
  
  // Novo estado para Multi-Select de Ambientes
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>([]);
  const [envInputValue, setEnvInputValue] = useState('');
  const [isEnvListOpen, setIsEnvListOpen] = useState(false);

  const [environmentVersion, setEnvironmentVersion] = useState('');
  const [evidenceDate, setEvidenceDate] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [solution, setSolution] = useState('');
  
  // Estado para controlar se o título foi editado manualmente
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);

  // Estados da Evidência Técnica (Defaults)
  const [status] = useState<TestStatus>(TestStatus.PASS);
  const [severity] = useState<Severity>(Severity.LOW);
  
  const [error, setError] = useState<string | null>(null);
  
  // Estado do Modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  
  // Estado para controle de expansão do histórico
  const [expandedHistoryRows, setExpandedHistoryRows] = useState<Set<string>>(new Set());

  const envInputRef = useRef<HTMLInputElement>(null);
  const envDropdownRef = useRef<HTMLDivElement>(null);

  // Effect para carregar dados iniciais (Edição de Histórico)
  useEffect(() => {
    if (initialTicketInfo) {
      setSprint(initialTicketInfo.sprint || '');
      setTicketId(initialTicketInfo.ticketId || '');
      setTicketTitle(initialTicketInfo.ticketTitle || '');
      setTicketSummary(initialTicketInfo.ticketSummary || '');
      setClientSystem(initialTicketInfo.clientSystem || '');
      setRequester(initialTicketInfo.requester || '');
      setAnalyst(initialTicketInfo.analyst || '');
      setRequestDate(initialTicketInfo.requestDate || '');
      setEnvironmentVersion(initialTicketInfo.environmentVersion || '');
      setEvidenceDate(initialTicketInfo.evidenceDate || '');
      setTicketDescription(initialTicketInfo.ticketDescription || '');
      setSolution(initialTicketInfo.solution || '');
      
      // Parse environments
      if (initialTicketInfo.environment) {
        const envs = initialTicketInfo.environment.split(',').map(e => e.trim()).filter(Boolean);
        setSelectedEnvs(envs);
      }
      
      setIsTitleManuallyEdited(true); // Evita sobrescrever o título ao carregar
    }
  }, [initialTicketInfo]);

  // Objeto auxiliar com os dados atuais do chamado para passar pro Wizard
  const currentTicketInfo: TicketInfo = {
    sprint,
    ticketId: ticketId.startsWith('#') ? ticketId : (ticketId ? `#${ticketId}` : ''),
    ticketTitle,
    ticketSummary,
    clientSystem,
    requester,
    analyst,
    requestDate,
    environment: selectedEnvs.join(', '),
    environmentVersion,
    evidenceDate: evidenceDate || new Date().toISOString().split('T')[0],
    ticketDescription,
    solution
  };

  // Notifica o componente pai sobre mudanças nos dados do chamado
  useEffect(() => {
    if (onTicketInfoChange) {
      onTicketInfoChange(currentTicketInfo);
    }
  }, [
    sprint, ticketId, ticketTitle, ticketSummary, clientSystem, 
    requester, analyst, requestDate, selectedEnvs, environmentVersion, 
    evidenceDate, ticketDescription, solution, onTicketInfoChange
  ]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        envDropdownRef.current && 
        !envDropdownRef.current.contains(event.target as Node) &&
        envInputRef.current &&
        !envInputRef.current.contains(event.target as Node)
      ) {
        setIsEnvListOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Efeito para sugerir automaticamente o título do chamado
  useEffect(() => {
    if (!isTitleManuallyEdited) {
      const parts = [];
      
      // 1. #Chamado
      if (ticketId) parts.push(ticketId.startsWith('#') ? ticketId : `#${ticketId}`);
      
      // 2. Cliente/Sistema
      if (clientSystem) parts.push(clientSystem);

      // 3. Resumo do Chamado
      if (ticketSummary) parts.push(ticketSummary);
      
      // 4. Ambiente do Commit (Junta os selecionados)
      if (selectedEnvs.length > 0) parts.push(selectedEnvs.join(' + '));
      
      // 5. Sprint (prefixo "Sprint")
      if (sprint) {
        const hasSprintPrefix = sprint.toLowerCase().includes('sprint');
        parts.push(hasSprintPrefix ? sprint : `Sprint ${sprint}`);
      }

      // 6. Solicitante / Analista de Teste
      const people = [];
      if (requester) people.push(requester);
      if (analyst) people.push(analyst);
      
      if (people.length > 0) {
        parts.push(people.join('/'));
      }

      if (parts.length > 0) {
        setTicketTitle(parts.join(' - '));
      }
    }
  }, [ticketId, clientSystem, ticketSummary, selectedEnvs, sprint, analyst, requester, isTitleManuallyEdited]);

  // Handlers para o Multi-Select de Ambientes
  const handleAddEnv = (env: string) => {
    const trimmedEnv = env.trim();
    if (trimmedEnv && !selectedEnvs.includes(trimmedEnv)) {
      setSelectedEnvs([...selectedEnvs, trimmedEnv]);
    }
    setEnvInputValue('');
    setIsEnvListOpen(false);
  };

  const handleRemoveEnv = (envToRemove: string) => {
    setSelectedEnvs(selectedEnvs.filter(env => env !== envToRemove));
  };

  const handleEnvKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEnv(envInputValue);
    } else if (e.key === 'Backspace' && !envInputValue && selectedEnvs.length > 0) {
      handleRemoveEnv(selectedEnvs[selectedEnvs.length - 1]);
    }
  };

  const toggleHistoryRow = (id: string) => {
    const newSet = new Set(expandedHistoryRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedHistoryRows(newSet);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!ticketId || !ticketTitle) {
      setError("Preencha pelo menos o ID do Chamado e Título do Chamado.");
      return;
    }

    // Preenche automaticamente a data da evidência com a data atual se não estiver preenchida
    if (!evidenceDate) {
      const today = new Date().toISOString().split('T')[0];
      setEvidenceDate(today);
    }
    
    // Abre o modal
    setShowConfirmationModal(true);
  };

  const handleConfirmSubmit = () => {
    onSubmit({
      title: "Registro do Chamado", // Título padrão
      description: "",
      status,
      severity,
      imageUrl: null,
      ticketInfo: currentTicketInfo
    });

    // Reset form
    setError(null);
    setShowConfirmationModal(false); 
  };

  // Filtra apenas evidências que são casos de teste (possuem testCaseDetails) e ordena crescentemente
  const historyItems = evidences
    .filter(ev => ev.testCaseDetails)
    .sort((a, b) => {
      const detailsA = a.testCaseDetails!;
      const detailsB = b.testCaseDetails!;
      if (detailsA.scenarioNumber !== detailsB.scenarioNumber) {
          return detailsA.scenarioNumber - detailsB.scenarioNumber;
      }
      return detailsA.caseNumber - detailsB.caseNumber;
    });
  
  // Estilo escuro específico para campos do Chamado
  const ticketInputClass = "w-full rounded-lg border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none";
  
  const labelClass = "block text-xs font-medium text-gray-700 mb-1";

  return (
    <form id="evidence-form" onSubmit={handlePreSubmit}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Registro de Evidência
          </h2>
          <p className="text-sm text-gray-500">Preencha as informações do chamado e utilize o assistente de cenários.</p>
        </div>
        
        <div className="p-6 space-y-8">
          
          {/* SEÇÃO 1: INFORMAÇÕES DO CHAMADO */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
              <Ticket className="w-4 h-4" /> Informações do Chamado
            </h3>
            
            {/* LINHA 1: TÍTULO DO CHAMADO (Destacado) */}
            <div className="w-full">
              <label className={labelClass}>Título do Chamado</label>
              <input 
                type="text" 
                value={ticketTitle} 
                onChange={e => {
                  setTicketTitle(e.target.value);
                  setIsTitleManuallyEdited(true);
                }} 
                className={`${ticketInputClass} font-medium border-blue-500/50`} 
                placeholder="Gerado automaticamente: #ID - Cliente - Resumo - Ambiente - Sprint - Solicitante/Analista" 
              />
            </div>

            {/* LINHA 2: DATAS (Lado a lado) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <label className={labelClass}>Data da Solicitação</label>
                <input 
                  type="date" 
                  value={requestDate} 
                  onChange={e => setRequestDate(e.target.value)} 
                  className={ticketInputClass} 
                  style={{ colorScheme: 'dark' }} 
                />
              </div>
              <div>
                <label className={labelClass}>Data da Evidência</label>
                <input 
                  type="date" 
                  value={evidenceDate} 
                  onChange={e => setEvidenceDate(e.target.value)} 
                  className={ticketInputClass} 
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            {/* LINHA 3: ID, SPRINT, PESSOAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Chamado (ID)</label>
                <input type="text" value={ticketId} onChange={e => setTicketId(e.target.value)} className={ticketInputClass} placeholder="#1234" />
              </div>
              <div>
                <label className={labelClass}>Sprint</label>
                <input type="text" value={sprint} onChange={e => setSprint(e.target.value)} className={ticketInputClass} placeholder="Ex: 24" />
              </div>
              <div>
                <label className={labelClass}>Solicitante</label>
                <input type="text" value={requester} onChange={e => setRequester(e.target.value)} className={ticketInputClass} placeholder="Quem solicitou" />
              </div>
              <div>
                <label className={labelClass}>Analista de Teste</label>
                <input type="text" value={analyst} onChange={e => setAnalyst(e.target.value)} className={ticketInputClass} placeholder="Seu nome" />
              </div>
            </div>

            {/* LINHA 4: RESUMO E SISTEMA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <label className={labelClass}>Resumo do Chamado</label>
                <input 
                  type="text" 
                  value={ticketSummary} 
                  onChange={e => setTicketSummary(e.target.value)} 
                  className={ticketInputClass} 
                  placeholder="Sugestão: máximo 2 palavras" 
                />
              </div>
               <div>
                <label className={labelClass}>Cliente / Sistema</label>
                <input type="text" value={clientSystem} onChange={e => setClientSystem(e.target.value)} className={ticketInputClass} placeholder="Ex: Portal Web" />
              </div>
            </div>

            {/* LINHA 5: AMBIENTE E DETALHES TÉCNICOS */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Componente Customizado de Ambiente Multi-Select */}
              <div className="relative z-20 md:col-span-2">
                <label className={labelClass}>Ambiente do Commit</label>
                <div 
                  className="w-full min-h-[38px] rounded-lg border border-gray-600 bg-gray-800 flex flex-wrap items-center gap-2 px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
                  onClick={() => {
                    envInputRef.current?.focus();
                    setIsEnvListOpen(true);
                  }}
                >
                  {selectedEnvs.map(env => (
                    <span key={env} className="bg-blue-900/50 text-blue-200 border border-blue-700/50 text-xs rounded-md px-2 py-0.5 flex items-center gap-1">
                      {env}
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleRemoveEnv(env); }} 
                        className="hover:text-white hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex-1 flex items-center min-w-[80px]">
                     <input
                        ref={envInputRef}
                        type="text"
                        value={envInputValue}
                        onChange={(e) => setEnvInputValue(e.target.value)}
                        onKeyDown={handleEnvKeyDown}
                        onFocus={() => setIsEnvListOpen(true)}
                        className="bg-transparent border-none text-gray-100 text-sm placeholder-gray-500 focus:ring-0 w-full p-0.5"
                        placeholder={selectedEnvs.length === 0 ? "Selecione ou digite..." : ""}
                     />
                     <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isEnvListOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                
                {/* Dropdown de Sugestões */}
                {isEnvListOpen && (
                  <div ref={envDropdownRef} className="absolute top-full left-0 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto z-30">
                    <div className="p-1">
                      {PREDEFINED_ENVS.filter(env => !selectedEnvs.includes(env) && env.toLowerCase().includes(envInputValue.toLowerCase())).map(env => (
                        <button
                          key={env}
                          type="button"
                          onClick={() => handleAddEnv(env)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 rounded-md transition-colors flex items-center justify-between group"
                        >
                          {env}
                          <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                        </button>
                      ))}
                      {envInputValue && !selectedEnvs.includes(envInputValue) && !PREDEFINED_ENVS.includes(envInputValue) && (
                         <button
                           type="button"
                           onClick={() => handleAddEnv(envInputValue)}
                           className="w-full text-left px-3 py-2 text-sm text-blue-300 hover:bg-gray-600 rounded-md transition-colors border-t border-gray-600 mt-1"
                         >
                           Adicionar "{envInputValue}"
                         </button>
                      )}
                      {PREDEFINED_ENVS.filter(env => !selectedEnvs.includes(env)).length === 0 && !envInputValue && (
                        <div className="px-3 py-2 text-xs text-gray-400 text-center">Todos selecionados</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Versão do Ambiente</label>
                <input type="text" value={environmentVersion} onChange={e => setEnvironmentVersion(e.target.value)} className={ticketInputClass} placeholder="v1.0.0" />
              </div>
            </div>

            {/* LINHA 6: DESCRIÇÕES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Descrição do Chamado</label>
                  <textarea rows={2} value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} className={ticketInputClass} placeholder="Detalhes da solicitação original..." />
                </div>
                <div>
                  <label className={labelClass}>Solução / Correção Aplicada</label>
                  <textarea rows={2} value={solution} onChange={e => setSolution(e.target.value)} className={ticketInputClass} placeholder="O que foi feito para resolver..." />
                </div>
            </div>
          </div>

          {/* SEÇÃO NOVA: HISTÓRICO DE TESTE */}
          {historyItems.length > 0 && (
            <div className="space-y-4 pt-4">
               <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <History className="w-4 h-4" /> Histórico de Teste
               </h3>
               
               <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                         <tr>
                           <th className="px-4 py-3 w-10">#</th>
                           <th className="px-4 py-3">Código ID</th>
                           <th className="px-4 py-3">Tela</th>
                           <th className="px-4 py-3 w-1/3">Funcionalidade</th>
                           <th className="px-4 py-3 text-center">Status</th>
                           <th className="px-4 py-3 text-right w-16"></th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                         {historyItems.map((item) => {
                            const details = item.testCaseDetails!;
                            const isExpanded = expandedHistoryRows.has(item.id);
                            
                            return (
                               <React.Fragment key={item.id}>
                                 <tr className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`} onClick={() => toggleHistoryRow(item.id)}>
                                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{details.scenarioNumber}.{details.caseNumber}</td>
                                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-600">{details.caseId}</td>
                                    <td className="px-4 py-3 text-gray-800 flex items-center gap-2">
                                       <Monitor className="w-3 h-3 text-gray-400" />
                                       {details.screen}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 truncate max-w-xs" title={details.objective}>
                                       {details.objective}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                          item.status === TestStatus.PASS ? 'bg-green-100 text-green-800' :
                                          item.status === TestStatus.FAIL ? 'bg-red-100 text-red-800' :
                                          item.status === TestStatus.BLOCKED ? 'bg-orange-100 text-orange-800' :
                                          'bg-gray-100 text-gray-800'
                                       }`}>
                                          {item.status === TestStatus.PASS && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                          {item.status === TestStatus.FAIL && <XCircle className="w-3 h-3 mr-1" />}
                                          {item.status === TestStatus.BLOCKED && <AlertCircle className="w-3 h-3 mr-1" />}
                                          {item.status === TestStatus.SKIPPED && <MinusCircle className="w-3 h-3 mr-1" />}
                                          {item.status === 'PASS' ? 'Aprovado' : item.status === 'FAIL' ? 'Falhou' : item.status === 'BLOCKED' ? 'Bloqueado' : 'Pulado'}
                                       </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                       <button type="button" className="text-gray-400 hover:text-blue-600">
                                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                       </button>
                                    </td>
                                 </tr>
                                 {isExpanded && (
                                    <tr className="bg-gray-50/50 shadow-inner">
                                       <td colSpan={6} className="px-4 py-4">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs px-2">
                                             <div className="bg-white p-3 rounded border border-gray-200">
                                                <span className="block font-bold text-gray-500 uppercase mb-1 text-[10px]">Pré-Requisito</span>
                                                <p className="text-gray-800">{details.preRequisite || 'N/A'}</p>
                                             </div>
                                             <div className="bg-white p-3 rounded border border-gray-200">
                                                <span className="block font-bold text-gray-500 uppercase mb-1 text-[10px]">Condição</span>
                                                <p className="text-gray-800">{details.condition || 'N/A'}</p>
                                             </div>
                                             <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                                <span className="block font-bold text-blue-600 uppercase mb-1 text-[10px]">Resultado Esperado</span>
                                                <p className="text-blue-900">{details.expectedResult || 'N/A'}</p>
                                             </div>
                                          </div>
                                       </td>
                                    </tr>
                                 )}
                               </React.Fragment>
                            );
                         })}
                       </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {/* SEÇÃO 2: EVIDÊNCIA TÉCNICA */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" /> Evidência Técnica (Teste)
                </h3>
            </div>

            {/* INLINE WIZARD PARA CENÁRIOS */}
            <div className="mb-6">
                <TestScenarioWizard 
                  onSave={onWizardSave} 
                  baseTicketInfo={currentTicketInfo}
                  wizardTrigger={wizardTrigger}
                  onClearTrigger={onClearTrigger}
                />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center animate-pulse border border-red-100">
              <span className="mr-2">●</span> {error}
            </div>
          )}
          
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop Blur */}
          <div 
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowConfirmationModal(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-gray-100">
             <div className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => setShowConfirmationModal(false)}>
               <X className="w-5 h-5" />
             </div>

             <div className="flex flex-col items-center text-center">
               <div className="bg-blue-100 p-4 rounded-full mb-4">
                 <Check className="w-8 h-8 text-blue-600" />
               </div>
               
               <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmar Gravação</h3>
               <p className="text-sm text-gray-500 mb-6">
                 Esta ação irá registrar os dados do chamado com a data <strong>{evidenceDate ? evidenceDate.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR')}</strong>. 
                 Deseja prosseguir?
               </p>

               <div className="w-full bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm border border-gray-200">
                  <p className="mb-1"><span className="font-bold text-gray-700">Chamado:</span> {ticketId}</p>
                  <p className="mb-1"><span className="font-bold text-gray-700">Título:</span> {ticketTitle}</p>
               </div>

               <div className="flex gap-3 w-full">
                 <button 
                   type="button"
                   onClick={() => setShowConfirmationModal(false)}
                   className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="button"
                   onClick={handleConfirmSubmit}
                   className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                 >
                   Confirmar & Salvar
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default EvidenceForm;
