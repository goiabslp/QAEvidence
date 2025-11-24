import React, { useState, useRef, useEffect } from 'react';
import { Bug, Save, AlertCircle, CheckCircle2, ChevronDown, Calendar, User, Monitor, Server, FileText, MessageSquare, Box, ClipboardList, Eye, Pencil, Trash2, ArrowUp, ArrowRight, ArrowDown, Image as ImageIcon, Plus, X, Crop, Clipboard, UploadCloud, Sparkles, Ban, List, Check, AlertTriangle, StickyNote, ChevronLeft, ChevronRight } from 'lucide-react';
import { BugReport, BugStatus, BugPriority } from '../types';
import ImageEditor from './ImageEditor';

interface BugReportFormProps {
  onSave: (bug: BugReport) => void;
  userAcronym: string;
  userName?: string;
  bugs?: BugReport[];
  onDelete?: (id: string) => void;
}

const getBrazilDateString = () => {
  const date = new Date();
  const brazilDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  const y = brazilDate.getFullYear();
  const m = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const d = String(brazilDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const PRIORITY_STYLES = {
  'Alta': 'bg-red-100 text-red-800 border-red-200',
  'Média': 'bg-amber-100 text-amber-800 border-amber-200',
  'Baixa': 'bg-blue-100 text-blue-800 border-blue-200'
};

const STATUS_COLORS = {
  [BugStatus.PENDING]: 'bg-slate-100 text-slate-600 border-slate-200',
  [BugStatus.OPEN_BUG]: 'bg-red-100 text-red-700 border-red-200',
  [BugStatus.OPEN_IMPROVEMENT]: 'bg-purple-100 text-purple-700 border-purple-200',
  [BugStatus.IN_ANALYSIS]: 'bg-amber-100 text-amber-700 border-amber-200',
  [BugStatus.AWAITING_FIX]: 'bg-orange-100 text-orange-700 border-orange-200',
  [BugStatus.IN_TEST]: 'bg-blue-100 text-blue-700 border-blue-200',
  [BugStatus.BLOCKED]: 'bg-rose-100 text-rose-800 border-rose-200',
  [BugStatus.DISCARDED]: 'bg-gray-100 text-gray-500 border-gray-200'
};

const PREDEFINED_ENVS = ['Trunk V11', 'Trunk V12', 'Tag V11', 'Tag V12', 'Protheus', 'Sisjuri'];

const BugReportForm: React.FC<BugReportFormProps> = ({ onSave, userAcronym, userName, bugs = [], onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<BugStatus>(BugStatus.PENDING);
  const [priority, setPriority] = useState<BugPriority>('Média');
  
  const [screen, setScreen] = useState('');
  const [module, setModule] = useState('');
  
  // Environment State (Tags)
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>([]);
  const [envInputValue, setEnvInputValue] = useState('');
  const [isEnvListOpen, setIsEnvListOpen] = useState(false);
  const envDropdownRef = useRef<HTMLDivElement>(null);
  const envInputRef = useRef<HTMLInputElement>(null);

  const [dev, setDev] = useState('');
  
  // Analyst auto-filled
  const analystName = userName ? `${userAcronym} - ${userName}` : userAcronym;

  // Prerequisites State
  const [preRequisites, setPreRequisites] = useState<string[]>([]);
  const [preReqInput, setPreReqInput] = useState('');

  const [description, setDescription] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [devFeedback, setDevFeedback] = useState('');
  const [observation, setObservation] = useState(''); // New State
  
  // Attachments State
  const [attachments, setAttachments] = useState<string[]>([]);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editingAttachmentIndex, setEditingAttachmentIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Custom Select State
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // DELETE MODAL STATES
  const [imageToDeleteIndex, setImageToDeleteIndex] = useState<number | null>(null);
  const [bugToDeleteId, setBugToDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Carousel Ref
  const bugsCarouselRef = useRef<HTMLDivElement>(null);

  const [date] = useState(getBrazilDateString()); // Read-only for display logic, actual save uses current date

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !description) {
      setError("Preencha o Resumo e a Descrição do Erro.");
      return;
    }

    const newBug: BugReport = {
      id: editingId || crypto.randomUUID(),
      summary,
      status,
      priority,
      screen,
      module,
      environment: selectedEnvs.join(', '), // Join tags to string for storage
      date: editingId ? date : getBrazilDateString(), // Keep original date on edit, or new date on create
      analyst: analystName,
      dev,
      preRequisites,
      scenarioDescription,
      expectedResult,
      description,
      devFeedback,
      observation,
      attachments,
      createdBy: userAcronym
    };

    onSave(newBug);

    setSuccessMsg(editingId ? "Bug atualizado com sucesso!" : "Bug registrado com sucesso!");
    setError(null);
    resetForm();

    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleEdit = (bug: BugReport) => {
      setEditingId(bug.id);
      setSummary(bug.summary);
      setStatus(bug.status);
      setPriority(bug.priority);
      setScreen(bug.screen);
      setModule(bug.module);
      
      // Parse environment string back to array
      if (bug.environment) {
        setSelectedEnvs(bug.environment.split(', ').filter(Boolean));
      } else {
        setSelectedEnvs([]);
      }

      setDev(bug.dev);
      setPreRequisites(bug.preRequisites || []);
      setDescription(bug.description);
      setScenarioDescription(bug.scenarioDescription);
      setExpectedResult(bug.expectedResult);
      setDevFeedback(bug.devFeedback);
      setObservation(bug.observation || '');
      setAttachments(bug.attachments || []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setSummary('');
    setStatus(BugStatus.PENDING);
    setPriority('Média');
    setScreen('');
    setModule('');
    setSelectedEnvs([]);
    setEnvInputValue('');
    setDev('');
    setPreRequisites([]);
    setPreReqInput('');
    setDescription('');
    setScenarioDescription('');
    setExpectedResult('');
    setDevFeedback('');
    setObservation('');
    setAttachments([]);
    setEditingAttachmentIndex(null);
    setEditorImageSrc(null);
    setImageToDeleteIndex(null);
    setBugToDeleteId(null);
  };

  // Environment Tag Handlers
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

  // Pre-requisites Handlers
  const handleAddPreReq = () => {
    if (!preReqInput.trim()) return;
    setPreRequisites([...preRequisites, preReqInput.trim()]);
    setPreReqInput('');
  };

  const handleRemovePreReq = (index: number) => {
    setPreRequisites(preRequisites.filter((_, i) => i !== index));
  };

  const handlePreReqKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPreReq();
    }
  };

  // Image Handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setEditorImageSrc(e.target.result as string);
        setEditingAttachmentIndex(null); // Indicates new image
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
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
                          setEditingAttachmentIndex(null);
                      }
                  };
                  reader.readAsDataURL(blob);
                  return;
              }
          }
          alert("Nenhuma imagem encontrada na área de transferência.");
      } catch (error) {
          console.error("Erro ao colar:", error);
          alert("Erro ao acessar a área de transferência. Verifique as permissões do navegador.");
      }
  };

  const handleEditorSave = (editedSrc: string) => {
    if (editingAttachmentIndex !== null) {
      // Update existing attachment
      const newAttachments = [...attachments];
      newAttachments[editingAttachmentIndex] = editedSrc;
      setAttachments(newAttachments);
    } else {
      // Add new attachment
      setAttachments([...attachments, editedSrc]);
    }
    setEditorImageSrc(null);
    setEditingAttachmentIndex(null);
  };

  const handleEditorCancel = () => {
    setEditorImageSrc(null);
    setEditingAttachmentIndex(null);
  };

  const handleEditAttachment = (index: number) => {
      setEditorImageSrc(attachments[index]);
      setEditingAttachmentIndex(index);
  };

  const handleRequestRemoveAttachment = (index: number) => {
      setImageToDeleteIndex(index);
  };

  const confirmRemoveAttachment = () => {
      if (imageToDeleteIndex !== null) {
          setAttachments(attachments.filter((_, i) => i !== imageToDeleteIndex));
          setImageToDeleteIndex(null);
      }
  };

  const handleRequestDeleteBug = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setBugToDeleteId(id);
  };

  const confirmDeleteBug = () => {
      if (bugToDeleteId && onDelete) {
          onDelete(bugToDeleteId);
          setBugToDeleteId(null);
      }
  };

  const handleCardClick = (e: React.MouseEvent, bug: BugReport) => {
    // Prevent if clicking on inner buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    handleEdit(bug);
  };

  // Carousel Logic
  const scrollBugs = (direction: 'left' | 'right') => {
    if (bugsCarouselRef.current) {
        const scrollAmount = direction === 'left' ? -350 : 350;
        bugsCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Modern Styling
  const inputClass = "w-full rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-3 text-sm placeholder-slate-400 transition-all outline-none shadow-sm";
  const labelClass = "block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider ml-1 flex items-center gap-1.5";

  return (
    <>
    {/* EDITOR MODAL */}
    {editorImageSrc && (
        <ImageEditor 
            imageSrc={editorImageSrc}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
        />
    )}

    {/* DELETE IMAGE MODAL */}
    {imageToDeleteIndex !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setImageToDeleteIndex(null)}
            ></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 border border-slate-100 animate-slide-down">
               <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-5 border border-red-200 shadow-sm">
                   <Trash2 className="h-7 w-7 text-red-600" />
               </div>
               
               <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Excluir Imagem</h3>
               <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
                   Deseja realmente excluir esta imagem? <br/>Esta ação não pode ser desfeita.
               </p>

               <div className="flex gap-3 w-full">
                 <button 
                   type="button"
                   onClick={() => setImageToDeleteIndex(null)}
                   className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="button"
                   onClick={confirmRemoveAttachment}
                   className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all transform active:scale-95"
                 >
                   Excluir
                 </button>
               </div>
            </div>
        </div>
    )}

    {/* DELETE BUG MODAL */}
    {bugToDeleteId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setBugToDeleteId(null)}
            ></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-slate-100 animate-slide-down">
               <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-5 border border-red-100 shadow-inner">
                   <AlertTriangle className="h-8 w-8 text-red-500" />
               </div>
               
               <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Confirmar exclusão</h3>
               <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed max-w-xs mx-auto">
                   Esta ação removerá permanentemente o registro do BUG. Deseja continuar?
               </p>

               <div className="flex gap-3 w-full">
                 <button 
                   type="button"
                   onClick={() => setBugToDeleteId(null)}
                   className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="button"
                   onClick={confirmDeleteBug}
                   className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all transform active:scale-95"
                 >
                   Excluir
                 </button>
               </div>
            </div>
        </div>
    )}

    <div className="space-y-12 animate-fade-in">
    
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-red-50/50 px-8 py-5 backdrop-blur-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-red-100">
              <Bug className="w-5 h-5 text-red-600" />
            </div>
            {editingId ? 'Editando BUG' : 'Registro de BUGs'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 ml-12">
            Documentação de erros e anomalias encontradas durante o ciclo de testes.
          </p>
        </div>
        {editingId && (
            <button 
                onClick={resetForm}
                className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
            >
                Cancelar Edição
            </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        
        {/* ROW 1: Summary, Status, Priority */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6">
            <label className={labelClass}>
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Resumo do BUG
            </label>
            <input 
              type="text" 
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={`${inputClass} font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
              placeholder="Ex: Botão de atualizar a tela não funciona"
              autoFocus={!!editingId}
            />
          </div>
          
          {/* Custom Status Select */}
          <div className="md:col-span-3">
             <label className={labelClass}>
               <ActivityIcon status={status} /> Status
             </label>
             <div className="relative" ref={statusDropdownRef}>
                <button
                   type="button"
                   onClick={() => setIsStatusOpen(!isStatusOpen)}
                   className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 text-sm font-bold transition-all shadow-sm ${STATUS_COLORS[status]} hover:opacity-90 active:scale-[0.99]`}
                >
                    <span className="flex items-center gap-2 truncate">
                        <ActivityIcon status={status} />
                        {status}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                </button>

                {isStatusOpen && (
                   <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-slide-down max-h-72 overflow-y-auto">
                      <div className="p-1.5 space-y-1">
                          {Object.values(BugStatus).map((s) => (
                             <button
                                key={s}
                                type="button"
                                onClick={() => {
                                   setStatus(s);
                                   setIsStatusOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                                    status === s ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                             >
                                <span className="flex items-center gap-2">
                                   <ActivityIcon status={s} />
                                   {s}
                                </span>
                                {status === s && <Check className="w-4 h-4 text-indigo-600" />}
                             </button>
                          ))}
                      </div>
                   </div>
                )}
             </div>
          </div>

          {/* Custom Priority Select (Segmented Control) */}
          <div className="md:col-span-3">
             <label className={labelClass}>
               Prioridade
             </label>
             <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                {(['Baixa', 'Média', 'Alta'] as BugPriority[]).map((p) => {
                    const isActive = priority === p;
                    let activeClass = '';
                    let icon = <ArrowRight className="w-3 h-3" />;
                    
                    if (p === 'Alta') {
                        activeClass = 'bg-white text-red-600 shadow-sm ring-1 ring-red-100';
                        icon = <ArrowUp className="w-3 h-3" />;
                    } else if (p === 'Média') {
                        activeClass = 'bg-white text-amber-600 shadow-sm ring-1 ring-amber-100';
                        icon = <ArrowRight className="w-3 h-3" />;
                    } else {
                        activeClass = 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100';
                        icon = <ArrowDown className="w-3 h-3" />;
                    }

                    return (
                        <button
                           key={p}
                           type="button"
                           onClick={() => setPriority(p)}
                           className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-[10px] font-bold uppercase transition-all ${
                               isActive ? activeClass : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                           }`}
                        >
                            {icon} {p}
                        </button>
                    );
                })}
             </div>
          </div>
        </div>

        {/* ROW 2: Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div>
              <label className={labelClass}>
                <Monitor className="w-3.5 h-3.5 text-slate-400" /> Tela
              </label>
              <input 
                type="text" 
                value={screen}
                onChange={(e) => setScreen(e.target.value.toUpperCase())}
                className={`${inputClass} focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                placeholder="Ex: PRESTAÇÃO DE CONTAS"
              />
           </div>
           <div>
              <label className={labelClass}>
                <Box className="w-3.5 h-3.5 text-slate-400" /> Módulo
              </label>
              <input 
                type="text" 
                value={module}
                onChange={(e) => setModule(e.target.value.toUpperCase())}
                className={`${inputClass} focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                placeholder="Ex: CONTROLE ORÇAMENTÁRIO"
              />
           </div>
           
           {/* ENVIRONMENT (Tags) */}
           <div className="relative z-20">
              <label className={labelClass}>
                <Server className="w-3.5 h-3.5 text-slate-400" /> Ambiente
              </label>
              <div 
                className="w-full min-h-[46px] rounded-lg border border-slate-300 bg-white flex flex-wrap items-center gap-2 px-3 py-2 focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500 transition-all shadow-sm hover:border-red-300"
                onClick={() => {
                    envInputRef.current?.focus();
                    setIsEnvListOpen(true);
                }}
              >
                  {selectedEnvs.map(env => (
                      <span key={env} className="bg-red-50 text-red-700 border border-red-100 text-xs font-medium rounded-md px-2 py-0.5 flex items-center gap-1 animate-fade-in">
                          {env}
                          <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); handleRemoveEnv(env); }} 
                              className="hover:bg-red-200 rounded-full p-0.5 transition-colors"
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
                          placeholder={selectedEnvs.length === 0 ? "Selecione uma Opção..." : ""}
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
                                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors flex items-center justify-between group"
                              >
                                  {env}
                                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-red-400" />
                              </button>
                          ))}
                          {envInputValue && !selectedEnvs.includes(envInputValue) && !PREDEFINED_ENVS.includes(envInputValue) && (
                              <button
                                  type="button"
                                  onClick={() => handleAddEnv(envInputValue)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors border-t border-slate-100 mt-1 font-medium"
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
        </div>
        
        {/* ROW 3: Personnel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
              <label className={labelClass}>
                <User className="w-3.5 h-3.5 text-slate-400" /> Analista (Responsável)
              </label>
              <input 
                type="text" 
                value={analystName}
                readOnly
                className={`${inputClass} bg-slate-50 text-slate-500 font-medium`}
              />
           </div>
           <div>
              <label className={labelClass}>
                <User className="w-3.5 h-3.5 text-slate-400" /> DEV Responsável
              </label>
              <input 
                type="text" 
                value={dev}
                onChange={(e) => setDev(e.target.value.toUpperCase())}
                className={`${inputClass} focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                placeholder="Nome do Desenvolvedor Responsável"
              />
           </div>
        </div>

        {/* ROW 4: Scenario Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className={labelClass}>
                   Descrição do Cenário
                </label>
                <textarea 
                   rows={3}
                   value={scenarioDescription}
                   onChange={(e) => setScenarioDescription(e.target.value)}
                   className={`${inputClass} resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                   placeholder="Contexto do teste realizado..."
                />
             </div>
             <div>
                <label className={labelClass}>
                   Resultado Esperado
                </label>
                <textarea 
                   rows={3}
                   value={expectedResult}
                   onChange={(e) => setExpectedResult(e.target.value)}
                   className={`${inputClass} resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                   placeholder="O que deveria ter acontecido..."
                />
             </div>
        </div>

        {/* ROW 5: Pré-requisitos (REORDERED) */}
        <div>
           <label className={labelClass}>
              <List className="w-3.5 h-3.5 text-slate-400" /> Pré-requisitos
           </label>
           
           <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={preReqInput}
                onChange={(e) => setPreReqInput(e.target.value)}
                onKeyDown={handlePreReqKeyDown}
                className={`${inputClass} py-2.5`}
                placeholder="Ex: Preferência, Dicionários de Dados..."
              />
              <button 
                type="button" 
                onClick={handleAddPreReq}
                className="bg-indigo-50 text-indigo-600 px-4 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
           </div>

           {preRequisites.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {preRequisites.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 shadow-sm animate-fade-in group">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                          <span>{req}</span>
                          <button 
                              type="button" 
                              onClick={() => handleRemovePreReq(idx)}
                              className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                          >
                              <X className="w-3 h-3" />
                          </button>
                      </div>
                  ))}
              </div>
           )}
        </div>

        <div className="border-t border-slate-100 my-4"></div>

        {/* ROW 6: Error Details & Feedback */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="flex flex-col h-full">
              <label className={labelClass}>
                 <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Descrição do Erro
              </label>
              <textarea 
                 rows={10}
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 className={`${inputClass} resize-none h-full bg-red-50/20 focus:ring-2 focus:ring-red-500 focus:border-red-500`}
                 placeholder="Descreva o passo a passo para reproduzir o erro, comportamento atual..."
              />
           </div>

           <div className="flex flex-col gap-6">
              <div className="flex flex-col flex-1">
                 <label className={labelClass}>
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Devolutiva do DEV
                 </label>
                 <textarea 
                    rows={4}
                    value={devFeedback}
                    onChange={(e) => setDevFeedback(e.target.value)}
                    className={`${inputClass} resize-none h-full bg-blue-50/30 border-blue-200 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300`}
                    placeholder="Retorno Técnico do DEV"
                 />
              </div>

              {/* OBSERVATION FIELD */}
              <div className="flex flex-col flex-1">
                 <label className={labelClass}>
                    <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Observação
                 </label>
                 <textarea 
                    rows={4}
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className={`${inputClass} resize-none h-full bg-amber-50/30 border-amber-200 focus:ring-amber-500 focus:border-amber-500 hover:border-amber-300`}
                    placeholder="Informações adicionais, lembretes..."
                 />
              </div>
           </div>
        </div>

        {/* ATTACHMENTS SECTION */}
        <div className="pt-4 border-t border-slate-100">
             <label className={labelClass}>
                 <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Evidências Visuais (Prints)
             </label>
             
             <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {/* Modern Upload Tile - REDESIGNED */}
                 <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative h-64 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-all duration-500 group overflow-hidden cursor-default
                    ${isDragging 
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-xl shadow-indigo-100' 
                    : 'border-slate-300 bg-slate-50/50 hover:bg-white hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-100/30'
                    }`}
                >
                    {/* Background Pattern/Gradient */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 via-transparent to-transparent"></div>

                    {/* Main Icon with Animation */}
                    <div className={`relative z-10 p-5 rounded-full bg-white shadow-lg ring-1 ring-slate-100 transition-all duration-500 group-hover:scale-110 group-hover:shadow-indigo-200 group-hover:ring-4 group-hover:ring-indigo-50 ${isDragging ? 'scale-110 ring-4 ring-indigo-100' : ''}`}>
                        <UploadCloud className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                    </div>
                    
                    {/* Action Area */}
                    <div className="relative z-10 flex flex-col items-center gap-3 w-full px-6">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePasteImage();
                            }}
                            className="w-full max-w-[240px] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2.5 group/btn"
                        >
                            <Clipboard className="w-5 h-5" />
                            <span>Inserir Print</span>
                            <span className="bg-white/20 text-indigo-50 text-[10px] px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block font-mono">CTRL+V</span>
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                             className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wide flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-white/80"
                        >
                            <ImageIcon className="w-4 h-4" />
                            Ou selecione um arquivo
                        </button>
                    </div>

                    {/* Hidden Input */}
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                    />
                </div>

                 {/* Thumbnails */}
                 {attachments.map((src, index) => (
                     <div key={index} className="relative h-64 bg-slate-100 rounded-2xl border border-slate-200 group overflow-hidden shadow-sm hover:shadow-md transition-all">
                         <img src={src} alt={`Evidência ${index + 1}`} className="w-full h-full object-cover" />
                         
                         {/* Overlay Actions */}
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                             <button 
                                 type="button" 
                                 onClick={() => handleEditAttachment(index)}
                                 className="p-2 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-lg transition-colors"
                                 title="Editar (Cortar/Destaque)"
                             >
                                 <Crop className="w-4 h-4" />
                             </button>
                             <button 
                                 type="button" 
                                 onClick={() => handleRequestRemoveAttachment(index)}
                                 className="p-2 bg-white/20 hover:bg-white text-white hover:text-red-600 rounded-lg transition-colors"
                                 title="Remover"
                             >
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         </div>
                     </div>
                 ))}
             </div>
             {attachments.length === 0 && (
                 <p className="text-xs text-slate-400 mt-2 italic flex items-center gap-1">
                     <ImageIcon className="w-3 h-3" /> Nenhuma imagem anexada.
                 </p>
             )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
           <div>
              {error && (
                 <span className="text-sm font-bold text-red-600 flex items-center gap-2 animate-pulse">
                    <AlertCircle className="w-4 h-4" /> {error}
                 </span>
              )}
              {successMsg && (
                 <span className="text-sm font-bold text-emerald-600 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" /> {successMsg}
                 </span>
              )}
           </div>

           <button 
              type="submit"
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
           >
              <Save className="w-4 h-4" />
              {editingId ? 'Atualizar BUG' : 'Salvar BUG'}
           </button>
        </div>

      </form>
    </div>

    {/* LIST SECTION - HORIZONTAL CAROUSEL */}
    <div className="space-y-6">
         <div className="flex items-center justify-between border-b border-slate-200 pb-4">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-slate-100 rounded-lg">
                     <ClipboardList className="w-5 h-5 text-slate-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">Bugs Registrados</h3>
                 <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{bugs.length}</span>
             </div>
         </div>

         {bugs.length === 0 ? (
             <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                 <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                     <CheckCircle2 className="w-8 h-8 text-slate-300" />
                 </div>
                 <h4 className="text-lg font-medium text-slate-900">Tudo limpo!</h4>
                 <p className="text-slate-500">Nenhum bug registrado até o momento.</p>
             </div>
         ) : (
             <div className="relative group/carousel">
                 
                 {/* LEFT NAV BUTTON */}
                 <button 
                    onClick={(e) => { e.stopPropagation(); scrollBugs('left'); }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 p-3 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all hidden md:flex items-center justify-center"
                 >
                     <ChevronLeft className="w-6 h-6" />
                 </button>

                 {/* RIGHT NAV BUTTON */}
                 <button 
                    onClick={(e) => { e.stopPropagation(); scrollBugs('right'); }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 p-3 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all hidden md:flex items-center justify-center"
                 >
                     <ChevronRight className="w-6 h-6" />
                 </button>

                 {/* Scrollable Container */}
                 <div 
                    ref={bugsCarouselRef}
                    className="flex overflow-x-auto gap-6 pb-6 px-1 scroll-smooth snap-x snap-mandatory scrollbar-hide"
                 >
                     {bugs.map((bug) => (
                         <div 
                             key={bug.id} 
                             onClick={(e) => handleCardClick(e, bug)}
                             className="w-[350px] flex-shrink-0 snap-center bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden cursor-pointer"
                         >
                             {/* Card Header */}
                             <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                                 <div className="flex justify-between items-start mb-3">
                                     <div className="flex-1 mr-2">
                                         <h4 className="font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-red-600 transition-colors" title={bug.summary}>
                                             {bug.summary}
                                         </h4>
                                     </div>
                                     <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                         bug.status === BugStatus.BLOCKED ? 'bg-red-50 text-red-700 border-red-100' :
                                         bug.status === BugStatus.IN_TEST ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                         bug.status === BugStatus.IN_ANALYSIS ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                         bug.status === BugStatus.OPEN_BUG ? 'bg-red-50 text-red-700 border-red-100' :
                                         bug.status === BugStatus.OPEN_IMPROVEMENT ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                         bug.status === BugStatus.DISCARDED ? 'bg-slate-100 text-slate-400 border-slate-200' :
                                         'bg-slate-100 text-slate-600 border-slate-200'
                                     }`}>
                                         {bug.status}
                                     </span>
                                 </div>
                                 
                                 <div className="flex items-center gap-2">
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide flex items-center gap-1 ${PRIORITY_STYLES[bug.priority]}`}>
                                         {bug.priority === 'Alta' && <ArrowUp className="w-3 h-3" />}
                                         {bug.priority === 'Média' && <ArrowRight className="w-3 h-3" />}
                                         {bug.priority === 'Baixa' && <ArrowDown className="w-3 h-3" />}
                                         {bug.priority}
                                     </span>
                                     <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                         <Calendar className="w-3 h-3" />
                                         {bug.date.split('-').reverse().join('/')}
                                     </span>
                                 </div>
                             </div>
                             
                             {/* Card Body */}
                             <div className="p-5 space-y-3 flex-1">
                                 <div className="grid grid-cols-2 gap-2 text-xs">
                                     <div>
                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Tela</span>
                                         <span className="font-semibold text-slate-700 line-clamp-1" title={bug.screen}>{bug.screen || '-'}</span>
                                     </div>
                                     <div>
                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Módulo</span>
                                         <span className="font-semibold text-slate-700 line-clamp-1" title={bug.module}>{bug.module || '-'}</span>
                                     </div>
                                     <div className="col-span-2">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Ambiente</span>
                                         <span className="font-semibold text-slate-700 line-clamp-1" title={bug.environment}>{bug.environment || '-'}</span>
                                     </div>
                                     {/* Pre-requisites summary in Card */}
                                     {bug.preRequisites && bug.preRequisites.length > 0 && (
                                        <div className="col-span-2 mt-2">
                                            <div className="flex flex-wrap gap-1">
                                                {bug.preRequisites.slice(0, 3).map((req, i) => (
                                                    <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold truncate max-w-[100px]">
                                                        {req}
                                                    </span>
                                                ))}
                                                {bug.preRequisites.length > 3 && (
                                                    <span className="text-[9px] text-slate-400 px-1 py-0.5">+{bug.preRequisites.length - 3}</span>
                                                )}
                                            </div>
                                        </div>
                                     )}
                                 </div>

                                 {bug.attachments && bug.attachments.length > 0 && (
                                    <div className="pt-2 mt-1 border-t border-slate-50 flex items-center gap-2">
                                        <ImageIcon className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500">{bug.attachments.length} Anexos</span>
                                    </div>
                                 )}
                             </div>
                             
                             {/* Card Footer */}
                             <div className="px-5 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                                 <div className="flex items-center gap-1.5">
                                     <div className="bg-white p-1 rounded-full shadow-sm border border-slate-200">
                                         <User className="w-3 h-3 text-slate-400" />
                                     </div>
                                     <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]" title={bug.analyst}>
                                         {bug.analyst.split(' - ')[0]}
                                     </span>
                                 </div>
                                 
                                 <div className="flex items-center gap-1">
                                     <button 
                                         onClick={(e) => { e.stopPropagation(); handleEdit(bug); }}
                                         className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                         title="Visualizar"
                                     >
                                         <Eye className="w-4 h-4" />
                                     </button>
                                     <button 
                                         onClick={(e) => { e.stopPropagation(); handleEdit(bug); }}
                                         className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                         title="Editar"
                                     >
                                         <Pencil className="w-4 h-4" />
                                     </button>
                                     {onDelete && (
                                         <button 
                                             onClick={(e) => handleRequestDeleteBug(bug.id, e)}
                                             className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                             title="Excluir"
                                         >
                                             <Trash2 className="w-4 h-4" />
                                         </button>
                                     )}
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}
    </div>

    </div>
    </>
  );
};

const ActivityIcon = ({status}: {status: BugStatus}) => {
   if (status === BugStatus.BLOCKED) return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
   if (status === BugStatus.IN_TEST) return <Monitor className="w-3.5 h-3.5 text-blue-500" />;
   if (status === BugStatus.OPEN_BUG) return <Bug className="w-3.5 h-3.5 text-red-600" />;
   if (status === BugStatus.OPEN_IMPROVEMENT) return <Sparkles className="w-3.5 h-3.5 text-purple-600" />;
   if (status === BugStatus.DISCARDED) return <Ban className="w-3.5 h-3.5 text-slate-400" />;
   return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
};

export default BugReportForm;