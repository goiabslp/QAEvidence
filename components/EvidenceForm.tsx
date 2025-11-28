import React, { useState, useRef, useEffect } from 'react';
import { TestStatus, Severity, EvidenceItem, TicketInfo, TicketPriority, TicketStatus } from '../types';
import { PRIORITY_CONFIG, TICKET_STATUS_CONFIG } from '../constants';
import TestScenarioWizard from './TestScenarioWizard';
import CustomDatePicker from './CustomDatePicker';
import { UploadCloud, Ticket, FileText, X, Check, Plus, ChevronDown, History, ChevronUp, Monitor, AlertCircle, CheckCircle2, XCircle, MinusCircle, Clock, RotateCcw, AlertTriangle, ArrowUp, ArrowRight, ArrowDown, Trash2, Crop, Clipboard, Image as ImageIcon, Pencil } from 'lucide-react';
import { WizardTriggerContext } from '../App';
import ImageEditor from './ImageEditor';

interface EvidenceFormProps {
  onSubmit: (evidence: Omit<EvidenceItem, 'id' | 'timestamp' | 'createdBy'>) => void;
  onWizardSave: (items: Omit<EvidenceItem, 'createdBy'>[]) => void;
  wizardTrigger?: WizardTriggerContext | null;
  onClearTrigger?: () => void;
  evidences?: EvidenceItem[];
  initialTicketInfo?: TicketInfo | null;
  onTicketInfoChange?: (info: TicketInfo) => void;
  onCancel?: () => void;
  onEditCase?: (id: string) => void;
}

const PREDEFINED_ENVS = ['Trunk V11', 'Trunk V12', 'Tag V11', 'Tag V12', 'Protheus', 'SISJURI'];

const getBrazilDateString = () => {
  const date = new Date();
  const brazilDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  const y = brazilDate.getFullYear();
  const m = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const d = String(brazilDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const EvidenceForm: React.FC<EvidenceFormProps> = ({ 
  onSubmit, 
  onWizardSave, 
  wizardTrigger, 
  onClearTrigger, 
  evidences = [], 
  initialTicketInfo,
  onTicketInfoChange,
  onCancel,
  onEditCase
}) => {
  const [sprint, setSprint] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [ticketSummary, setTicketSummary] = useState(''); 
  const [clientSystem, setClientSystem] = useState('');
  const [ticketTitle, setTicketTitle] = useState('');
  const [requester, setRequester] = useState('');
  const [analyst, setAnalyst] = useState('');
  const [requestDate, setRequestDate] = useState('');
  
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>([]);
  const [envInputValue, setEnvInputValue] = useState('');
  const [isEnvListOpen, setIsEnvListOpen] = useState(false);

  const [environmentVersion, setEnvironmentVersion] = useState('');
  
  // INITIALIZE WITH TODAY (Requirement: Automate Evidence Date with Brazil Time)
  const [evidenceDate, setEvidenceDate] = useState(initialTicketInfo?.evidenceDate || getBrazilDateString());
  
  const [ticketDescription, setTicketDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>(TicketStatus.PENDING);
  
  // BLOCKAGE STATE
  const [blockageReason, setBlockageReason] = useState('');
  const [blockageImages, setBlockageImages] = useState<string[]>([]);

  // IMAGE EDITOR & UPLOAD STATE FOR BLOCKAGE
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false);
  const [isTicketInfoExpanded, setIsTicketInfoExpanded] = useState(true);

  const [status] = useState<TestStatus>(TestStatus.PASS);
  const [severity] = useState<Severity>(Severity.LOW);
  
  const [error, setError] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [expandedHistoryRows, setExpandedHistoryRows] = useState<Set<string>>(new Set());

  const envInputRef = useRef<HTMLInputElement>(null);
  const envDropdownRef = useRef<HTMLDivElement>(null);
  const wizardSectionRef = useRef<HTMLDivElement>(null);

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
      // If editing, load original date, but App.tsx will overwrite on save with current date as per requirement
      setEvidenceDate(initialTicketInfo.evidenceDate || ''); 
      setTicketDescription(initialTicketInfo.ticketDescription || '');
      setSolution(initialTicketInfo.solution || '');
      setPriority(initialTicketInfo.priority || TicketPriority.MEDIUM);
      setTicketStatus(initialTicketInfo.ticketStatus || TicketStatus.PENDING);
      setBlockageReason(initialTicketInfo.blockageReason || '');
      setBlockageImages(initialTicketInfo.blockageImageUrls || []);
      
      if (initialTicketInfo.environment) {
        const envs = initialTicketInfo.environment.split(',').map(e => e.trim()).filter(Boolean);
        setSelectedEnvs(envs);
      }
      
      // CRITICAL: Reset manual edit flag to false when loading a ticket.
      setIsTitleManuallyEdited(false);
    }
  }, [initialTicketInfo]);

  // Collapse Ticket Info automatically when Wizard is triggered and Scroll to Wizard
  useEffect(() => {
    if (wizardTrigger) {
      setIsTicketInfoExpanded(false);
      
      // Wait for collapse animation then scroll
      setTimeout(() => {
        if (wizardSectionRef.current) {
             const headerOffset = 100; // Adjust for sticky header
             const elementPosition = wizardSectionRef.current.getBoundingClientRect().top;
             const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
             
             window.scrollTo({
                 top: offsetPosition,
                 behavior: "smooth"
             });
        }
      }, 300);
    }
  }, [wizardTrigger]);

  // Clear Blockage Data if Status is not BLOCKED
  useEffect(() => {
    if (ticketStatus !== TicketStatus.BLOCKED) {
        if (blockageReason !== '') setBlockageReason('');
        if (blockageImages.length > 0) setBlockageImages([]);
    }
  }, [ticketStatus]);

  const currentTicketInfo: TicketInfo = {
    sprint,
    ticketId: ticketId.startsWith('#') ? ticketId : (ticketId ? `#${ticketId}` : ''),
    ticketTitle,
    ticketSummary,
    clientSystem,
    requester,
    analyst,
    requestDate,
    priority,
    ticketStatus,
    environment: selectedEnvs.join(', '),
    environmentVersion,
    evidenceDate: evidenceDate || getBrazilDateString(),
    ticketDescription,
    solution,
    blockageReason: ticketStatus === TicketStatus.BLOCKED ? blockageReason : undefined,
    blockageImageUrls: ticketStatus === TicketStatus.BLOCKED ? blockageImages : undefined
  };

  useEffect(() => {
    if (onTicketInfoChange) {
      onTicketInfoChange(currentTicketInfo);
    }
  }, [
    sprint, ticketId, ticketTitle, ticketSummary, clientSystem, 
    requester, analyst, requestDate, selectedEnvs, environmentVersion, 
    evidenceDate, ticketDescription, solution, priority, ticketStatus, blockageReason, blockageImages, onTicketInfoChange
  ]);

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

  useEffect(() => {
    if (!isTitleManuallyEdited) {
      const parts = [];
      if (ticketId) parts.push(ticketId.startsWith('#') ? ticketId : `#${ticketId}`);
      if (clientSystem) parts.push(clientSystem);
      if (ticketSummary) parts.push(ticketSummary);
      if (selectedEnvs.length > 0) parts.push(selectedEnvs.join(' + '));
      if (sprint) {
        const hasSprintPrefix = sprint.toLowerCase().includes('sprint');
        parts.push(hasSprintPrefix ? sprint : `Sprint ${sprint}`);
      }
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
      handleRemoveEnv(selectedEnvs[selectedEnvs.length - 0]);
    }
  };

  // --- IMAGE HANDLING FOR BLOCKAGE ---
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setEditorImageSrc(e.target.result as string);
        setEditingImageIndex(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };

  const handlePasteImage = async () => {
      try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
              if (item.types.some(type => type.startsWith('image/'))) {
                  const blob = await item.getType(item.types.find(type => type.startsWith('image/'))!);
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      if (e.target?.result) {
                          setEditorImageSrc(e.target.result as string);
                          setEditingImageIndex(null);
                      }
                  };
                  reader.readAsDataURL(blob);
                  return;
              }
          }
          alert("Nenhuma imagem encontrada na área de transferência.");
      } catch (error) {
          console.error("Erro ao colar:", error);
          alert("Erro ao acessar a área de transferência. Verifique as permissões.");
      }
  };

  const handleEditorSave = (editedSrc: string) => {
    if (editingImageIndex !== null) {
        const newImages = [...blockageImages];
        newImages[editingImageIndex] = editedSrc;
        setBlockageImages(newImages);
    } else {
        setBlockageImages([...blockageImages, editedSrc]);
    }
    setEditorImageSrc(null);
    setEditingImageIndex(null);
  };

  const handleEditorCancel = () => {
    setEditorImageSrc(null);
    setEditingImageIndex(null);
  };

  const handleEditImage = (index: number) => {
      setEditorImageSrc(blockageImages[index]);
      setEditingImageIndex(index);
  };

  const handleRemoveImage = (index: number) => {
      setBlockageImages(blockageImages.filter((_, i) => i !== index));
  };
  // ------------------------------------

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
    if (!ticketId || !ticketTitle) {
      setError("Preencha pelo menos o ID do Chamado e Título do Chamado.");
      return;
    }
    if (!evidenceDate) {
      setEvidenceDate(getBrazilDateString());
    }
    setShowConfirmationModal(true);
  };

  const handleConfirmSubmit = () => {
    onSubmit({
      title: "Registro do Chamado",
      description: "",
      status,
      severity,
      imageUrl: null,
      ticketInfo: currentTicketInfo
    });
    setError(null);
    setShowConfirmationModal(false); 
  };

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
  
  // MODERN LIGHT THEME STYLES
  const ticketInputClass = "w-full rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-2.5 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none shadow-sm hover:border-indigo-300";
  const labelClass = "block text-xs font-bold text-indigo-900 mb-1.5 uppercase tracking-wider ml-1";

  return (
    <>
    {/* Editor Modal outside form structure */}
    {editorImageSrc && (
        <ImageEditor 
            imageSrc={editorImageSrc}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
        />
    )}

    <form id="evidence-form" onSubmit={handlePreSubmit}>
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-8 relative">
        
        {/* HEADER */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-8 py-5 backdrop-blur-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                {onCancel ? 'Editando Chamado' : 'Registro de Evidência'}
            </h2>
            <p className="text-sm text-slate-500 mt-1 ml-12">
               {onCancel ? 'Altere as informações abaixo e salve.' : 'Preencha as informações do chamado e utilize o assistente de cenários.'}
            </p>
          </div>
          
          {onCancel && (
              <button 
                  type="button" 
                  onClick={onCancel}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg border border-red-200 hover:border-red-300 transition-all text-sm font-bold shadow-sm"
              >
                  <X className="w-4 h-4" />
                  Fechar
              </button>
          )}
        </div>
        
        <div className="p-8 space-y-10">
          
          {/* SEÇÃO 1: INFORMAÇÕES DO CHAMADO */}
          <div className="space-y-6">
            <div 
                className="flex items-center justify-between pb-2 border-b border-slate-100 cursor-pointer group select-none"
                onClick={() => setIsTicketInfoExpanded(!isTicketInfoExpanded)}
            >
               <div className="flex items-center gap-3">
                 <div className="p-1.5 bg-indigo-50 rounded-md">
                   <Ticket className="w-4 h-4 text-indigo-600" /> 
                 </div>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider group-hover:text-indigo-700 transition-colors">
                    Informações do Chamado
                 </h3>
               </div>
               <button type="button" className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                 {isTicketInfoExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
               </button>
            </div>
            
            {isTicketInfoExpanded && (
                <div className="space-y-6 animate-slide-down">
                    {/* LINHA 1: TÍTULO DO CHAMADO */}
                    <div className="w-full">
                        <label className={labelClass}>Título do Chamado</label>
                        <input 
                            type="text" 
                            value={ticketTitle} 
                            onChange={e => {
                            setTicketTitle(e.target.value);
                            setIsTitleManuallyEdited(true);
                            }} 
                            className={`${ticketInputClass} font-medium text-slate-900`} 
                            placeholder="Gerado automaticamente..." 
                        />
                    </div>

                    {/* LINHA 2: ID, SPRINT, DATAS (Reorganized for width) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className={labelClass}>Chamado (ID)</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                value={ticketId.replace('#', '')} 
                                onChange={e => setTicketId(e.target.value.replace(/\D/g, ''))} 
                                className={ticketInputClass} 
                                placeholder="Ex: 58645" 
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Data Solicitação</label>
                            <CustomDatePicker 
                                value={requestDate}
                                onChange={setRequestDate}
                                placeholder="Selecione"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Data da Evidência</label>
                            <CustomDatePicker 
                                value={evidenceDate}
                                onChange={setEvidenceDate}
                                placeholder="Selecione"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Sprint</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                value={sprint} 
                                onChange={e => setSprint(e.target.value.replace(/\D/g, ''))} 
                                className={ticketInputClass} 
                                placeholder="Ex: 24" 
                            />
                        </div>
                    </div>

                    {/* LINHA 3: STATUS & PRIORIDADE (Chips Row) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start py-2">
                        {/* TICKET STATUS CHIPS */}
                        <div>
                            <label className={labelClass}>Status do Chamado</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {Object.values(TicketStatus).map((status) => {
                                    const config = TICKET_STATUS_CONFIG[status];
                                    const Icon = config.icon;
                                    const isSelected = ticketStatus === status;
                                    
                                    return (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setTicketStatus(status)}
                                            className={`
                                                group flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold uppercase tracking-wide transition-all duration-200 shadow-sm
                                                ${isSelected 
                                                    ? `${config.color} ring-2 ring-offset-1 ring-white scale-105 z-10` 
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700'
                                                }
                                            `}
                                        >
                                            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-current' : 'text-slate-400 group-hover:text-slate-500'}`} />
                                            {config.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* PRIORITY BUTTONS */}
                        <div>
                            <label className={labelClass}>Prioridade</label>
                            <div className="flex gap-2 mt-2">
                                {[
                                    { value: TicketPriority.LOW, label: 'Baixa', icon: ArrowDown, colorClass: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200', activeClass: 'bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-50' },
                                    { value: TicketPriority.MEDIUM, label: 'Média', icon: ArrowRight, colorClass: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200', activeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 ring-2 ring-emerald-50' },
                                    { value: TicketPriority.HIGH, label: 'Alta', icon: ArrowUp, colorClass: 'hover:bg-red-50 hover:text-red-700 hover:border-red-200', activeClass: 'bg-red-100 text-red-700 border-red-200 ring-2 ring-red-50' }
                                ].map((option) => {
                                    const Icon = option.icon;
                                    const isActive = priority === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setPriority(option.value)}
                                            className={`flex-1 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
                                                isActive 
                                                ? option.activeClass 
                                                : `bg-white text-slate-400 border-slate-200 ${option.colorClass}`
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* LINHA 4: PESSOAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className={labelClass}>Solicitante</label>
                          <input 
                            type="text" 
                            value={requester} 
                            onChange={e => setRequester(e.target.value.toUpperCase())} 
                            className={ticketInputClass} 
                            placeholder="Ex: YEB, LVM..." 
                          />
                      </div>
                      <div>
                          <label className={labelClass}>Analista de Teste</label>
                          <input 
                            type="text" 
                            value={analyst} 
                            onChange={e => setAnalyst(e.target.value.toUpperCase())} 
                            className={ticketInputClass} 
                            placeholder="Analista" 
                          />
                      </div>
                    </div>

                    {/* LINHA 5: CONTEXTO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Resumo do Chamado</label>
                            <input 
                            type="text" 
                            value={ticketSummary} 
                            onChange={e => setTicketSummary(e.target.value.toUpperCase())} 
                            className={ticketInputClass} 
                            placeholder="Ex: Erro de Anexo (Máx. 3 palavras)" 
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Cliente / Sistema</label>
                            <input 
                                type="text" 
                                value={clientSystem} 
                                onChange={e => setClientSystem(e.target.value.toUpperCase())} 
                                className={ticketInputClass} 
                                placeholder="Ex: Veirano, Kincaid, LegalDesk, Protheus..." 
                            />
                        </div>
                    </div>

                    {/* LINHA 6: AMBIENTE */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative z-20 md:col-span-2">
                        <label className={labelClass}>Ambiente do Commit / Teste</label>
                        <div 
                        className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white flex flex-wrap items-center gap-2 px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-sm hover:border-indigo-300"
                        onClick={() => {
                            envInputRef.current?.focus();
                            setIsEnvListOpen(true);
                        }}
                        >
                        {selectedEnvs.map(env => (
                            <span key={env} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium rounded-md px-2 py-0.5 flex items-center gap-1">
                            {env}
                            <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); handleRemoveEnv(env); }} 
                                className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                            </span>
                        ))}
                        <div className="flex-1 flex items-center min-w-[100px]">
                            <input
                                ref={envInputRef}
                                type="text"
                                value={envInputValue}
                                onChange={(e) => setEnvInputValue(e.target.value)}
                                onKeyDown={handleEnvKeyDown}
                                onFocus={() => setIsEnvListOpen(true)}
                                className="bg-transparent border-none text-slate-700 text-sm placeholder-slate-400 focus:ring-0 w-full p-0.5"
                                placeholder={selectedEnvs.length === 0 ? "Onde foi realizado o Commit ou Local do Teste" : ""}
                            />
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEnvListOpen ? 'rotate-180' : ''}`} />
                        </div>
                        </div>
                        
                        {isEnvListOpen && (
                        <div ref={envDropdownRef} className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-30">
                            <div className="p-1">
                            {PREDEFINED_ENVS.filter(env => !selectedEnvs.includes(env) && env.toLowerCase().includes(envInputValue.toLowerCase())).map(env => (
                                <button
                                key={env}
                                type="button"
                                onClick={() => handleAddEnv(env)}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center justify-between group"
                                >
                                {env}
                                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400" />
                                </button>
                            ))}
                            {envInputValue && !selectedEnvs.includes(envInputValue) && !PREDEFINED_ENVS.includes(envInputValue) && (
                                <button
                                type="button"
                                onClick={() => handleAddEnv(envInputValue)}
                                className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border-t border-slate-100 mt-1 font-medium"
                                >
                                Adicionar "{envInputValue}"
                                </button>
                            )}
                            {PREDEFINED_ENVS.filter(env => !selectedEnvs.includes(env)).length === 0 && !envInputValue && (
                                <div className="px-3 py-2 text-xs text-slate-400 text-center">Todos selecionados</div>
                            )}
                            </div>
                        </div>
                        )}
                    </div>
                    <div>
                        <label className={labelClass}>Versão do Ambiente</label>
                        <input 
                            type="text" 
                            value={environmentVersion} 
                            onChange={e => setEnvironmentVersion(e.target.value.toUpperCase())} 
                            className={ticketInputClass} 
                            placeholder="v1.0.0" 
                        />
                    </div>
                    </div>

                    {/* LINHA 7: DESCRITIVO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                        <label className={labelClass}>Descrição do Chamado</label>
                        <textarea rows={2} value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} className={ticketInputClass} placeholder="Detalhes da solicitação..." />
                        </div>
                        <div>
                        <label className={labelClass}>Solução / Correção Aplicada</label>
                        <textarea rows={2} value={solution} onChange={e => setSolution(e.target.value)} className={ticketInputClass} placeholder="O que foi feito..." />
                        </div>
                    </div>

                    {/* BLOCKAGE SUBSECTION - Conditional Rendering */}
                    {ticketStatus === TicketStatus.BLOCKED && (
                        <div className="md:col-span-2 space-y-4 animate-fade-in border-t border-rose-100 pt-6 mt-2">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-rose-100 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                </div>
                                <h4 className="text-sm font-bold text-rose-800 uppercase tracking-wider">
                                    Motivo do Impedimento
                                </h4>
                            </div>
                            
                            {/* Reason Text Area */}
                            <div>
                                <textarea
                                    rows={3}
                                    value={blockageReason}
                                    onChange={(e) => setBlockageReason(e.target.value)}
                                    className={`${ticketInputClass} border-rose-200 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30`}
                                    placeholder="Descreva o motivo do impedimento..."
                                />
                            </div>

                            {/* Image Upload Section */}
                            <div>
                                <label className={labelClass}>
                                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Evidências do Impedimento
                                </label>
                                {/* Grid of images */}
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                     {/* Modern Upload Tile */}
                                     <div 
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`relative h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-300 group overflow-hidden cursor-default
                                        ${isDragging 
                                        ? 'border-rose-500 bg-rose-50/50 scale-[1.02] shadow-xl shadow-rose-100' 
                                        : 'border-slate-300 bg-slate-50/50 hover:bg-white hover:border-rose-400 hover:shadow-lg hover:shadow-rose-100/30'
                                        }`}
                                    >
                                        <div className={`relative z-10 p-3 rounded-full bg-white shadow-lg ring-1 ring-slate-100 transition-all duration-500 group-hover:scale-110 group-hover:shadow-rose-200 group-hover:ring-4 group-hover:ring-rose-50 ${isDragging ? 'scale-110 ring-4 ring-rose-100' : ''}`}>
                                            <UploadCloud className={`w-8 h-8 transition-colors duration-300 ${isDragging ? 'text-rose-600' : 'text-slate-400 group-hover:text-rose-500'}`} />
                                        </div>
                                        
                                        <div className="relative z-10 flex flex-col items-center gap-2 w-full px-4">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePasteImage(); }}
                                                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                                            >
                                                <Clipboard className="w-4 h-4" /> Colar Print
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}
                                                 className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-wide flex items-center gap-1"
                                            >
                                                <ImageIcon className="w-3 h-3" /> Arquivo
                                            </button>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </div>
                                    
                                    {/* Thumbnails */}
                                    {blockageImages.map((src, index) => (
                                        <div key={index} className="relative h-48 bg-slate-100 rounded-2xl border border-slate-200 group overflow-hidden shadow-sm hover:shadow-md transition-all">
                                            <img src={src} alt={`Impedimento ${index + 1}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                                <button type="button" onClick={() => handleEditImage(index)} className="p-2 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-lg transition-colors"><Crop className="w-4 h-4" /></button>
                                                <button type="button" onClick={() => handleRemoveImage(index)} className="p-2 bg-white/20 hover:bg-white text-white hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* SEÇÃO 2: HISTÓRICO */}
          {historyItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
               <div className="flex items-center gap-3 pb-2">
                 <div className="p-1.5 bg-slate-100 rounded-md">
                   <History className="w-4 h-4 text-slate-600" />
                 </div>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Histórico de Teste
                 </h3>
               </div>
               
               <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                         <tr>
                           <th className="px-4 py-3 w-10">#</th>
                           <th className="px-4 py-3">Código ID</th>
                           <th className="px-4 py-3">Tela</th>
                           <th className="px-4 py-3 w-1/3">Funcionalidade</th>
                           <th className="px-4 py-3 text-center">Status</th>
                           <th className="px-4 py-3 text-right w-24"></th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {historyItems.map((item) => {
                            const details = item.testCaseDetails!;
                            const isExpanded = expandedHistoryRows.has(item.id);
                            
                            return (
                               <React.Fragment key={item.id}>
                                 <tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`} onClick={() => toggleHistoryRow(item.id)}>
                                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{details.scenarioNumber}.{details.caseNumber}</td>
                                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-600">{details.caseId}</td>
                                    <td className="px-4 py-3 text-slate-800 flex items-center gap-2">
                                       <Monitor className="w-3 h-3 text-slate-400" />
                                       {details.screen}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 truncate max-w-xs" title={details.objective}>
                                       {details.objective}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                          item.status === TestStatus.PASS ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                          item.status === TestStatus.FAIL ? 'bg-red-100 text-red-800 border border-red-200' :
                                          item.status === TestStatus.BLOCKED ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                          item.status === TestStatus.PENDING ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                          item.status === TestStatus.SKIPPED ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                                          'bg-slate-100 text-slate-800 border border-slate-200'
                                       }`}>
                                          {item.status === TestStatus.PASS && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                          {item.status === TestStatus.FAIL && <XCircle className="w-3 h-3 mr-1" />}
                                          {item.status === TestStatus.BLOCKED && <AlertCircle className="w-3 h-3 mr-1" />}
                                          {item.status === TestStatus.SKIPPED && <Clock className="w-3 h-3 mr-1" />}
                                          {item.status === TestStatus.PENDING && <Clock className="w-3 h-3 mr-1" />}
                                          
                                          {item.status === TestStatus.PASS ? 'Sucesso' : 
                                           item.status === TestStatus.FAIL ? 'Falha' : 
                                           item.status === TestStatus.BLOCKED ? 'Impedimento' : 
                                           item.status === TestStatus.SKIPPED ? 'Pendente' :
                                           item.status === TestStatus.PENDING ? 'Pendente' : 
                                           'Pendente'} 
                                       </span>
                                    </td>
                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                       {onEditCase && (
                                           <button 
                                              type="button" 
                                              onClick={(e) => { e.stopPropagation(); onEditCase(item.id); }}
                                              className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-slate-100 rounded transition-colors"
                                              title="Editar Caso"
                                           >
                                              <Pencil className="w-4 h-4" />
                                           </button>
                                       )}
                                       <button type="button" className="text-slate-400 hover:text-indigo-600">
                                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                       </button>
                                    </td>
                                 </tr>
                                 {isExpanded && (
                                    <tr className="bg-slate-50/50 shadow-inner">
                                       <td colSpan={6} className="px-4 py-4">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs px-2">
                                             <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                <span className="block font-bold text-indigo-900 uppercase mb-1 text-[10px]">Pré-Requisito</span>
                                                <p className="text-slate-800">{details.preRequisite || 'N/A'}</p>
                                             </div>
                                             <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                <span className="block font-bold text-indigo-900 uppercase mb-1 text-[10px]">Descrição do Teste</span>
                                                <p className="text-slate-800">{details.condition || 'N/A'}</p>
                                             </div>
                                             <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 shadow-sm">
                                                <span className="block font-bold text-indigo-900 uppercase mb-1 text-[10px]">Resultado Esperado</span>
                                                <p className="text-indigo-900">{details.expectedResult || 'N/A'}</p>
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

          {/* SEÇÃO 3: WIZARD */}
          <div ref={wizardSectionRef} className="space-y-4 pt-4 border-t border-dashed border-slate-200">
            <div className="flex justify-between items-center pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-indigo-50 rounded-md">
                        <UploadCloud className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Evidência Técnica (Teste)
                    </h3>
                </div>
            </div>

            <div className="mb-6">
                <TestScenarioWizard 
                  onSave={onWizardSave} 
                  baseTicketInfo={currentTicketInfo}
                  wizardTrigger={wizardTrigger}
                  onClearTrigger={onClearTrigger}
                  existingEvidences={evidences}
                />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex items-center animate-pulse border border-red-200 shadow-sm">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" /> 
              {error}
            </div>
          )}
          
          {/* Action Footer for Form - "Close" Button specifically here if editing */}
          {onCancel && (
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
               <button 
                  type="button" 
                  onClick={onCancel}
                  className="px-6 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
              >
                  <X className="w-4 h-4" />
                  Fechar
              </button>
            </div>
          )}

        </div>
      </div>

      {/* MODAL */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowConfirmationModal(false)}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-slate-100">
             <div className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setShowConfirmationModal(false)}>
               <X className="w-5 h-5" />
             </div>

             <div className="flex flex-col items-center text-center">
               <div className="bg-emerald-100 p-4 rounded-full mb-4 border border-emerald-200">
                 <Check className="w-8 h-8 text-emerald-600" />
               </div>
               
               <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Gravação</h3>
               <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                 Esta ação irá registrar os dados do chamado com a data <strong>{evidenceDate ? evidenceDate.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR')}</strong>.
               </p>

               <div className="w-full bg-slate-50 rounded-lg p-4 mb-6 text-left text-sm border border-slate-200">
                  <p className="mb-2 border-b border-slate-200 pb-2"><span className="font-bold text-slate-700 block text-xs uppercase">Chamado</span> {ticketId}</p>
                  <p><span className="font-bold text-slate-700 block text-xs uppercase">Título</span> {ticketTitle}</p>
                  <p className="mt-2 pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700 block text-xs uppercase">Status</span> 
                    {TICKET_STATUS_CONFIG[ticketStatus].label}
                  </p>
               </div>

               <div className="flex gap-3 w-full">
                 <button 
                   type="button"
                   onClick={() => setShowConfirmationModal(false)}
                   className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="button"
                   onClick={handleConfirmSubmit}
                   className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                 >
                   Confirmar
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </form>
    </>
  );
};

export default EvidenceForm;