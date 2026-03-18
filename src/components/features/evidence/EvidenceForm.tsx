import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { TestStatus, Severity, EvidenceItem, TicketInfo, TicketPriority, TicketStatus } from '@/types';
import { PRIORITY_CONFIG, TICKET_STATUS_CONFIG } from '@/constants';
import TestScenarioWizard from '../wizard/TestScenarioWizard';
import CustomDatePicker from '@/components/common/CustomDatePicker';
import { UploadCloud, Ticket, FileText, X, Check, Plus, ChevronDown, History, ChevronUp, Monitor, AlertCircle, CheckCircle2, XCircle, MinusCircle, Clock, RotateCcw, AlertTriangle, ArrowUp, ArrowRight, ArrowDown, Trash2, Crop, Clipboard, Image as ImageIcon, Pencil, Sparkles, Code, Brain, HelpCircle, Square, Save } from 'lucide-react';
import { WizardTriggerContext } from '@/App';
import ImageEditor from '@/components/common/ImageEditor';
import { getBrazilDateString } from '@/utils/dateUtils';

interface EvidenceFormProps {
  onSubmit: (evidence: Omit<EvidenceItem, 'id' | 'timestamp' | 'createdBy'>) => void;
  onWizardSave: (items: Omit<EvidenceItem, 'createdBy'>[]) => Promise<{ success: boolean; error?: string }>;
  wizardTrigger?: WizardTriggerContext | null;
  onClearTrigger?: () => void;
  evidences?: EvidenceItem[];
  initialTicketInfo?: TicketInfo | null;
  onTicketInfoChange?: (info: TicketInfo) => void;
  onCancel?: () => void;
  onEditCase?: (id: string) => void;
  invalidFields?: string[];
}

const PREDEFINED_ENVS = ['Trunk V11', 'Trunk V12', 'Tag V11', 'Tag V12', 'Protheus', 'SISJURI'];


const EvidenceForm = forwardRef<any, EvidenceFormProps>(({
  onSubmit,
  onWizardSave,
  wizardTrigger,
  onClearTrigger,
  evidences = [],
  initialTicketInfo,
  onTicketInfoChange,
  onCancel,
  onEditCase,
  invalidFields = []
}, ref) => {
  const [sprint, setSprint] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [isImprovement, setIsImprovement] = useState(false);
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
  const [errorOrigin, setErrorOrigin] = useState('');
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>(TicketStatus.PENDING);

  // BLOCKAGE STATE
  const [blockageReason, setBlockageReason] = useState('');
  const [blockageImages, setBlockageImages] = useState<string[]>([]);

  // IMAGE EDITOR & UPLOAD STATE FOR BLOCKAGE
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editorInitialTool, setEditorInitialTool] = useState<'CROP' | 'BOX'>('CROP');
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
  const wizardRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    getTicketInfo: () => currentTicketInfo,
    getWizardDraft: () => wizardRef.current?.getDraft ? wizardRef.current.getDraft() : null,
    isWizardOpen: () => wizardRef.current?.isOpen ? wizardRef.current.isOpen() : false,
    getExpandedRows: () => Array.from(expandedHistoryRows)
  }));

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (initialTicketInfo) {
      // If NOT already initialized or if initialTicketInfo has changed significantly (different ticket)
      const isNewTicket = !isInitializedRef.current || (initialTicketInfo.ticketId && initialTicketInfo.ticketId !== ticketId);
      
      if (isNewTicket) {
        setSprint(initialTicketInfo.sprint || '');
        setTicketId(initialTicketInfo.ticketId || '');
        setIsImprovement(initialTicketInfo.isImprovement || false);
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
        setPriority(initialTicketInfo.priority || TicketPriority.MEDIUM);
        setErrorOrigin(initialTicketInfo.errorOrigin || '');
        setTicketStatus(initialTicketInfo.ticketStatus || TicketStatus.PENDING);
        setBlockageReason(initialTicketInfo.blockageReason || '');
        setBlockageImages(initialTicketInfo.blockageImageUrls || []);

        if (initialTicketInfo.environment) {
          const envs = initialTicketInfo.environment.split(',').map(e => e.trim()).filter(Boolean);
          setSelectedEnvs(envs);
        }

        setIsTitleManuallyEdited(false);
        isInitializedRef.current = true;
      } else {
        // If already initialized but blockageImageUrls arrived later (progressive load)
        if (initialTicketInfo.blockageImageUrls && 
            initialTicketInfo.blockageImageUrls.length > 0 && 
            blockageImages.length === 0) {
          setBlockageImages(initialTicketInfo.blockageImageUrls);
        }
      }
    }
  }, [initialTicketInfo, ticketId, blockageImages.length]);
  useEffect(() => {
    if (wizardTrigger) {
      setIsTicketInfoExpanded(false);

      setTimeout(() => {
        if (wizardSectionRef.current) {
          const headerOffset = 100;
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

  useEffect(() => {
    if (ticketStatus !== TicketStatus.BLOCKED) {
      if (blockageReason !== '') setBlockageReason('');
      if (blockageImages.length > 0) setBlockageImages([]);
    }
  }, [ticketStatus]);

  const currentTicketInfo: TicketInfo = {
    sprint,
    ticketId: ticketId.startsWith('#') ? ticketId : (ticketId ? `#${ticketId}` : ''),
    isImprovement,
    ticketTitle,
    ticketSummary,
    clientSystem,
    requester,
    analyst,
    requestDate,
    priority,
    errorOrigin,
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
    sprint, ticketId, isImprovement, ticketTitle, ticketSummary, clientSystem,
    requester, analyst, requestDate, selectedEnvs, environmentVersion,
    evidenceDate, ticketDescription, solution, priority, errorOrigin, ticketStatus, blockageReason, blockageImages, onTicketInfoChange
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
      if (isImprovement) parts.push("Melhoria");
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
  }, [ticketId, isImprovement, clientSystem, ticketSummary, selectedEnvs, sprint, analyst, requester, isTitleManuallyEdited]);

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

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setEditorImageSrc(e.target.result as string);
        setEditorInitialTool('CROP');
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
              setEditorInitialTool('CROP');
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
    setEditorInitialTool('CROP');
    setEditingImageIndex(null);
  };

  const handleEditImage = (index: number, initialTool: 'CROP' | 'BOX' = 'CROP') => {
    setEditorImageSrc(blockageImages[index]);
    setEditorInitialTool(initialTool);
    setEditingImageIndex(index);
  };
  const handleRemoveImage = (index: number) => {
    setBlockageImages(blockageImages.filter((_, i) => i !== index));
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

  const ticketInputClass = "w-full rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-2.5 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none shadow-sm hover:border-indigo-300";
  const labelClass = "block text-xs font-bold text-indigo-900 mb-1.5 uppercase tracking-wider ml-1 flex items-center gap-1.5";
  const isInvalid = (label: string) => invalidFields.includes(label);
  const getFieldClass = (label: string) => `${ticketInputClass} ${isInvalid(label) ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : 'text-slate-900'}`;

  return (
    <>
      {editorImageSrc && (
        <ImageEditor
          imageSrc={editorImageSrc}
          initialTool={editorInitialTool}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      <form id="evidence-form" onSubmit={handlePreSubmit}>
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-8 relative">


          <div className="p-8 space-y-10">

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
                  <div className="w-full">
                    <label className={labelClass}>
                      Título do Chamado
                      {isInvalid('Título do Chamado') && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                    </label>
                    <input
                      type="text"
                      value={ticketTitle}
                      onChange={e => {
                        setTicketTitle(e.target.value);
                        setIsTitleManuallyEdited(true);
                      }}
                      className={getFieldClass('Título do Chamado')}
                      placeholder="Gerado automaticamente..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        Chamado (ID)
                        {isInvalid('ID do Chamado') && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={ticketId.replace('#', '')}
                        onChange={e => setTicketId(e.target.value.replace(/\D/g, ''))}
                        className={getFieldClass('ID do Chamado')}
                        placeholder="Ex: 58645"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className={labelClass}>
                        <Sparkles className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
                        Melhoria
                      </label>
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                        <button
                          type="button"
                          onClick={() => setIsImprovement(false)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${!isImprovement
                            ? 'bg-white text-slate-700 shadow-sm border border-slate-200'
                            : 'text-slate-400 hover:text-slate-500'
                            }`}
                        >
                          <X className={`w-3.5 h-3.5 ${!isImprovement ? 'text-red-500' : 'text-slate-300'}`} />
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsImprovement(true)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isImprovement
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-500 scale-105 z-10'
                            : 'text-slate-400 hover:text-slate-500'
                            }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${isImprovement ? 'text-white' : 'text-slate-300'}`} />
                          Sim
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-1">
                      <label className={labelClass}>
                        Sprint
                        {isInvalid('Sprint') && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={sprint}
                        onChange={e => setSprint(e.target.value.replace(/\D/g, ''))}
                        className={getFieldClass('Sprint')}
                        placeholder="Ex: 24"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className={labelClass}>
                        Data Solicitação
                        {isInvalid('Data da Solicitação') && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      </label>
                      <div className={isInvalid('Data da Solicitação') ? 'ring-2 ring-red-100 rounded-xl' : ''}>
                        <CustomDatePicker
                          value={requestDate}
                          onChange={setRequestDate}
                          placeholder="Selecione"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <label className={labelClass}>Data da Evidência</label>
                      <CustomDatePicker
                        value={evidenceDate}
                        onChange={setEvidenceDate}
                        placeholder="Selecione"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start py-2">
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
                              className={`flex-1 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${isActive
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

                  <div className="w-full pt-2">
                    <div className="flex items-center gap-2 mb-1.5 ml-1">
                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        Origem do Erro
                      </label>
                      <button
                        type="button"
                        onClick={() => setErrorOrigin('')}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-all active:scale-90"
                        title="Limpar seleção de Origem do Erro"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {[
                        { id: 'Desenvolvimento Incompleto', label: 'Desenvolvimento Incompleto', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', active: 'bg-orange-600 text-white border-orange-700 shadow-orange-100' },
                        { id: 'Desenvolvimento Incorreto', label: 'Desenvolvimento Incorreto', icon: Code, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', active: 'bg-red-600 text-white border-red-700 shadow-red-100' },
                        { id: 'Entendimento Incorreto', label: 'Entendimento Incorreto', icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', active: 'bg-purple-600 text-white border-purple-700 shadow-purple-100' },
                        { id: 'Indefinido', label: 'Indefinido', icon: HelpCircle, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', active: 'bg-slate-600 text-white border-slate-700 shadow-slate-100' }
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const isActive = errorOrigin === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setErrorOrigin(opt.id)}
                            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-[11px] font-bold uppercase tracking-wide transition-all shadow-sm ${isActive
                              ? `${opt.active} scale-[1.02] ring-2 ring-offset-1 ring-white z-10`
                              : `bg-white ${opt.color} ${opt.border} hover:${opt.bg} hover:border-indigo-300`
                              }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : opt.color}`} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>
                        Solicitante
                        {isInvalid('Solicitante') && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      </label>
                      <input
                        type="text"
                        value={requester}
                        onChange={e => setRequester(e.target.value.toUpperCase())}
                        className={getFieldClass('Solicitante')}
                        placeholder="Ex: YEB, LVM..."
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Analista de Teste
                        {isInvalid('Analista de Teste') && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      </label>
                      <input
                        type="text"
                        value={analyst}
                        onChange={e => setAnalyst(e.target.value.toUpperCase())}
                        className={getFieldClass('Analista de Teste')}
                        placeholder="Analista"
                      />
                    </div>
                  </div>

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
                      <label className={labelClass}>
                        Cliente / Sistema
                        {isInvalid('Cliente / Sistema') && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      </label>
                      <input
                        type="text"
                        value={clientSystem}
                        onChange={e => setClientSystem(e.target.value.toUpperCase())}
                        className={getFieldClass('Cliente / Sistema')}
                        placeholder="Ex: Veirano, Kincaid, LegalDesk, Protheus..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative z-20 md:col-span-2">
                      <label className={labelClass}>
                        Ambiente do Commit / Teste
                        {isInvalid('Ambiente do Commit / Teste') && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      </label>
                      <div
                        className={`w-full min-h-[42px] rounded-lg border flex flex-wrap items-center gap-2 px-2 py-1.5 focus-within:ring-2 focus-within:transition-all shadow-sm ${isInvalid('Ambiente do Commit / Teste') ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : 'border-slate-300 bg-white focus-within:ring-indigo-500 focus-within:border-indigo-500 hover:border-indigo-300'}`}
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

                      <div>
                        <textarea
                          rows={3}
                          value={blockageReason}
                          onChange={(e) => setBlockageReason(e.target.value)}
                          className={`${ticketInputClass} border-rose-200 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30`}
                          placeholder="Descreva o motivo do impedimento..."
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Evidências do Impedimento
                        </label>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

                          {blockageImages.map((src, index) => (
                            <div key={index} className="relative h-48 bg-slate-100 rounded-2xl border border-slate-200 group overflow-hidden shadow-sm hover:shadow-md transition-all">
                              <img src={src} alt={`Impedimento ${index + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                <button type="button" onClick={() => handleEditImage(index, 'CROP')} className="p-2 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-lg transition-colors" title="Cortar"><Crop className="w-4 h-4" /></button>
                                <button type="button" onClick={() => handleEditImage(index, 'BOX')} className="p-2 bg-white/20 hover:bg-white text-white hover:text-red-600 rounded-lg transition-colors" title="Destacar"><Square className="w-4 h-4" /></button>
                                <button type="button" onClick={() => handleRemoveImage(index)} className="p-2 bg-white/20 hover:bg-white text-white hover:text-slate-600 rounded-lg transition-colors" title="Remover"><Trash2 className="w-4 h-4" /></button>
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
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${item.status === TestStatus.PASS ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
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

            <div ref={wizardSectionRef} className="space-y-4">

              <div className="mb-6">
                <TestScenarioWizard
                  ref={wizardRef}
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
});

export default EvidenceForm;
