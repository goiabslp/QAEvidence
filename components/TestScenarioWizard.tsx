import React, { useState, useEffect, useRef } from 'react';
import { TestCaseDetails, EvidenceItem, TestStatus, Severity, TicketInfo, TestStep, TicketPriority } from '../types';
import { Play, CheckCircle, XCircle, AlertTriangle, X, Layers, Monitor, Info, Pencil, Plus, Image as ImageIcon, Trash2, ChevronDown, ChevronUp, Fingerprint, Clock, Crop, Clipboard } from 'lucide-react';
import { WizardTriggerContext } from '../App';
import ImageEditor from './ImageEditor';

interface TestScenarioWizardProps {
  onSave: (items: Omit<EvidenceItem, 'createdBy'>[]) => void;
  baseTicketInfo?: TicketInfo;
  wizardTrigger?: WizardTriggerContext | null;
  onClearTrigger?: () => void;
  existingEvidences?: EvidenceItem[];
}

const generateCaseId = () => {
  const randomNum = Math.floor(Math.random() * 90000) + 10000;
  return `QA-${randomNum}`;
};

// Modern Light Theme Input
const inputClass = "w-full rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-2.5 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none shadow-sm hover:border-indigo-300";
const labelClass = "block text-xs font-bold text-indigo-900 mb-1.5 uppercase tracking-wider ml-1";

const TestScenarioWizard: React.FC<TestScenarioWizardProps> = ({ onSave, baseTicketInfo, wizardTrigger, onClearTrigger, existingEvidences = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScenarioNum, setCurrentScenarioNum] = useState(1);
  const [caseNumOverride, setCaseNumOverride] = useState<number | null>(null);
  const [isPreReqExpanded, setIsPreReqExpanded] = useState(false);

  // Image Editor State
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<TestCaseDetails>>({
    caseId: generateCaseId(),
    result: 'Pendente',
    screen: '',
    objective: '',
    preRequisite: '',
    condition: '',
    expectedResult: '',
    failureReason: ''
  });
  
  const [preReqInput, setPreReqInput] = useState('');

  const [isTestStarted, setIsTestStarted] = useState(false);
  const [steps, setSteps] = useState<TestStep[]>([]);

  // PREVENT FORM SUBMISSION ON ENTER KEY
  const preventSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (wizardTrigger) {
      setIsOpen(true);
      setCurrentScenarioNum(wizardTrigger.scenarioNumber);
      setCaseNumOverride(wizardTrigger.nextCaseNumber);

      if (wizardTrigger.mode === 'edit' && wizardTrigger.existingDetails) {
        setFormData({ ...wizardTrigger.existingDetails });
        if (wizardTrigger.existingDetails.steps && wizardTrigger.existingDetails.steps.length > 0) {
            setSteps(wizardTrigger.existingDetails.steps);
            setIsTestStarted(true);
        } else {
            setSteps([]);
            setIsTestStarted(false);
        }
      } else {
        setFormData(prev => ({ 
          ...prev, 
          caseId: generateCaseId(),
          screen: '',
          objective: '',
          preRequisite: '',
          condition: '',
          expectedResult: '',
          result: 'Pendente',
          failureReason: ''
        }));
        setSteps([]);
        setIsTestStarted(false);
        setPreReqInput('');
      }
    }
  }, [wizardTrigger]);

  useEffect(() => {
    if (isOpen && !wizardTrigger) {
       setFormData(prev => ({...prev, caseId: prev.caseId || generateCaseId()}));
       setCaseNumOverride(null);
    }
  }, [isOpen, wizardTrigger]);

  const handleOpen = () => {
    let nextScenario = 1;
    if (existingEvidences.length > 0) {
        const scenarios = existingEvidences
            .filter(e => e.testCaseDetails)
            .map(e => e.testCaseDetails!.scenarioNumber);
        
        if (scenarios.length > 0) {
            nextScenario = Math.max(...scenarios) + 1;
        }
    }
    setCurrentScenarioNum(nextScenario);
    setIsOpen(true);
  };

  const resetForm = () => {
    setFormData({
      caseId: generateCaseId(),
      result: 'Pendente',
      screen: '',
      objective: '',
      preRequisite: '',
      condition: '',
      expectedResult: '',
      failureReason: ''
    });
    setSteps([]);
    setIsTestStarted(false);
    setPreReqInput('');
    setIsPreReqExpanded(false);
    setEditorImageSrc(null);
    setEditingStepIndex(null);
  };

  const handleInputChange = (field: keyof TestCaseDetails, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper to manage pre-requisite list
  const preReqList = formData.preRequisite ? formData.preRequisite.split('\n').filter(Boolean) : [];
  const maxVisiblePreReqs = 3;
  const visiblePreReqs = isPreReqExpanded ? preReqList : preReqList.slice(0, maxVisiblePreReqs);
  const hiddenCount = Math.max(0, preReqList.length - maxVisiblePreReqs);

  const handleAddPreReq = () => {
    if (!preReqInput.trim()) return;
    const newList = [...preReqList, preReqInput.trim()];
    handleInputChange('preRequisite', newList.join('\n'));
    setPreReqInput('');
  };

  const handleRemovePreReq = (index: number) => {
    const newList = preReqList.filter((_, i) => i !== index);
    handleInputChange('preRequisite', newList.join('\n'));
  };

  const handlePreReqKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPreReq();
    }
  };

  const handleStartTest = () => {
    setIsTestStarted(true);
    if (steps.length === 0) {
        setSteps([{ stepNumber: 1, description: '' }]);
    }
  };

  const handleAddStep = () => {
    setSteps(prev => [...prev, { stepNumber: prev.length + 1, description: '' }]);
  };

  const handleStepDescriptionChange = (index: number, text: string) => {
    const newSteps = [...steps];
    newSteps[index].description = text;
    setSteps(newSteps);
  };

  const handleStepImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const src = reader.result as string;
            // Instead of setting immediately, open editor
            setEditorImageSrc(src);
            setEditingStepIndex(index);
        };
        reader.readAsDataURL(file);
    }
    // Reset input to allow re-uploading same file
    e.target.value = '';
  };

  const handlePasteStepImage = async (index: number) => {
      try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
              if (item.types.some(type => type.startsWith('image/'))) {
                  const blob = await item.getType(item.types.find(type => type.startsWith('image/'))!);
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      if (e.target?.result) {
                          setEditorImageSrc(e.target.result as string);
                          setEditingStepIndex(index);
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
    if (editingStepIndex !== null) {
        const newSteps = [...steps];
        newSteps[editingStepIndex].imageUrl = editedSrc;
        setSteps(newSteps);
    }
    setEditorImageSrc(null);
    setEditingStepIndex(null);
  };

  const handleEditorCancel = () => {
    setEditorImageSrc(null);
    setEditingStepIndex(null);
  };

  const handleEditExistingImage = (index: number) => {
      const currentImg = steps[index].imageUrl;
      if (currentImg) {
          setEditorImageSrc(currentImg);
          setEditingStepIndex(index);
      }
  };

  const handleRemoveStepImage = (index: number) => {
    const newSteps = [...steps];
    newSteps[index].imageUrl = null;
    setSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
     const newSteps = steps.filter((_, i) => i !== index).map((step, i) => ({
         ...step,
         stepNumber: i + 1
     }));
     setSteps(newSteps);
     if (newSteps.length === 0) setIsTestStarted(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClearTrigger) onClearTrigger();
    resetForm();
    setCaseNumOverride(null);
  };

  const handleSave = () => {
    const caseNumberToUse = caseNumOverride || 1;

    const testDetails: TestCaseDetails = {
        scenarioNumber: currentScenarioNum,
        caseNumber: caseNumberToUse,
        caseId: formData.caseId || generateCaseId(),
        screen: formData.screen || 'N/A',
        result: (formData.result as any) || 'Pendente',
        objective: formData.objective || 'N/A',
        preRequisite: formData.preRequisite || 'N/A',
        condition: formData.condition || 'N/A',
        expectedResult: formData.expectedResult || 'N/A',
        // Only save failure reason if result is Falha or Impedimento
        failureReason: (formData.result === 'Falha' || formData.result === 'Impedimento' ? formData.failureReason : undefined),
        steps: steps.length > 0 ? steps : undefined
    };

    let status = TestStatus.PENDING;
    let severity = Severity.LOW;
    
    if (testDetails.result === 'Sucesso') {
        status = TestStatus.PASS;
    } else if (testDetails.result === 'Falha') {
        status = TestStatus.FAIL;
        severity = Severity.HIGH;
    } else if (testDetails.result === 'Impedimento') {
        status = TestStatus.BLOCKED;
        severity = Severity.MEDIUM;
    }

    const sourceTicketInfo = wizardTrigger ? wizardTrigger.ticketInfo : baseTicketInfo;
    const defaultTicketInfo: TicketInfo = {
        ticketId: 'N/A',
        ticketTitle: `Cenário de Teste #${testDetails.scenarioNumber}`,
        sprint: 'N/A',
        ticketSummary: 'Cenário de Teste',
        clientSystem: 'N/A',
        requester: 'QA',
        analyst: 'QA',
        priority: TicketPriority.MEDIUM,
        requestDate: new Date().toISOString().split('T')[0],
        environment: 'N/A',
        environmentVersion: 'N/A',
        evidenceDate: new Date().toISOString().split('T')[0],
        ticketDescription: '',
        solution: ''
    };

    const ticketInfoToUse: TicketInfo = sourceTicketInfo ? { 
        ...sourceTicketInfo,
        ticketId: sourceTicketInfo.ticketId || defaultTicketInfo.ticketId,
        ticketTitle: sourceTicketInfo.ticketTitle || defaultTicketInfo.ticketTitle,
    } : defaultTicketInfo;

    const isEditMode = wizardTrigger?.mode === 'edit';

    const newItem: Omit<EvidenceItem, 'createdBy'> = {
        id: isEditMode && wizardTrigger?.evidenceId ? wizardTrigger.evidenceId : crypto.randomUUID(),
        title: `Cenário de Teste ${testDetails.scenarioNumber}: ${testDetails.screen}`,
        description: testDetails.objective, 
        imageUrl: steps.length > 0 ? steps[steps.length-1].imageUrl || null : null,
        status: status,
        severity: severity,
        timestamp: Date.now(), 
        testCaseDetails: testDetails,
        ticketInfo: ticketInfoToUse
    };

    onSave([newItem]);
    
    if (wizardTrigger) {
        handleClose();
    } else {
        resetForm();
        setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
        <div className="flex justify-center w-full py-4">
            <button 
                type="button"
                onClick={handleOpen}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-white shadow-lg transition-all hover:shadow-indigo-200 hover:scale-[1.01] active:scale-95 w-full md:w-auto"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full transition-transform group-hover:translate-y-0 duration-300"></div>
                <div className="relative flex items-center justify-center gap-3 font-bold tracking-wide text-sm">
                    <Play className="w-5 h-5 fill-current" />
                    NOVO CENÁRIO DE TESTE
                </div>
            </button>
        </div>
    );
  }

  const isEditMode = wizardTrigger?.mode === 'edit';

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

    <div className="w-full bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-lg ring-1 ring-black/5 animate-slide-down transition-all duration-300">
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${wizardTrigger ? 'bg-blue-50/80 border-blue-100' : 'bg-indigo-50/80 border-indigo-100'} backdrop-blur-sm`}>
            <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${wizardTrigger ? 'text-blue-900' : 'text-indigo-900'}`}>
                    {isEditMode ? <Pencil className="w-5 h-5 text-blue-600" /> : <Layers className={`${wizardTrigger ? 'text-blue-600' : 'text-indigo-600'} w-5 h-5`} />}
                    {isEditMode ? 'Editar Caso de Teste' : (wizardTrigger ? 'Adicionar Caso ao Cenário' : 'Assistente de Cenários')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    {isEditMode 
                     ? 'Atualize as informações do caso existente.' 
                     : (wizardTrigger ? 'Adicionando novo caso de teste ao cenário existente.' : 'Preenchimento rápido e padronizado.')}
                </p>
            </div>
            
            <button 
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-white">
            <div className="space-y-8 animate-fade-in">
                {/* Status Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                        <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Cenário</span>
                        <div className="text-2xl font-bold text-indigo-700">#{currentScenarioNum}</div>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                        <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Caso</span>
                        <div className="text-2xl font-bold text-blue-700 flex items-center gap-2">
                            #{caseNumOverride || 1}
                            {wizardTrigger && !isEditMode && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full tracking-wide font-semibold">+ NOVO</span>}
                            {isEditMode && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full tracking-wide font-semibold">EDIT</span>}
                        </div>
                    </div>
                    
                    {/* MODERN UNIQUE ID DISPLAY */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="absolute -right-2 -top-2 text-slate-200 group-hover:text-slate-300 transition-colors transform rotate-12">
                            <Fingerprint className="w-16 h-16 opacity-20" />
                        </div>
                        
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5 mb-2">
                            <Fingerprint className="w-3 h-3" /> ID Único
                        </span>
                        
                        <div className="relative flex items-center">
                            <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-slate-700 font-mono text-sm font-bold tracking-wide flex items-center gap-2 group-hover:border-indigo-200 group-hover:text-indigo-700 transition-all w-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                {formData.caseId}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* Row 1: Tela de Teste */}
                    <div className="md:col-span-2">
                        <label className={labelClass}>Tela de Teste</label>
                        <div className="relative">
                            <Monitor className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                value={formData.screen}
                                onChange={(e) => handleInputChange('screen', e.target.value)}
                                onKeyDown={preventSubmit}
                                className={`${inputClass} pl-10`}
                                placeholder="Aprovação, Prestação de Contas, Cliente..."
                            />
                        </div>
                    </div>

                    {/* Row 2: Objetivo & Pré-Requisito */}
                    <div>
                        <label className={labelClass}>Objetivo / Funcionalidade</label>
                        <textarea 
                            rows={3}
                            value={formData.objective}
                            onChange={(e) => handleInputChange('objective', e.target.value)}
                            className={inputClass}
                            placeholder="Qual o objetivo deste teste?"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className={labelClass}>Pré-Requisito</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={preReqInput}
                                onChange={(e) => setPreReqInput(e.target.value)}
                                onKeyDown={handlePreReqKeyDown}
                                className={inputClass}
                                placeholder="Ex: Ativar Preferencia, Ativar Dicionários"
                            />
                            <button 
                                type="button" 
                                onClick={handleAddPreReq}
                                className="bg-indigo-50 text-indigo-600 px-3 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {preReqList.length > 0 && (
                            <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-100 transition-all">
                                <div className="flex flex-wrap gap-2">
                                    {visiblePreReqs.map((req, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 shadow-sm animate-fade-in">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0"></span>
                                            <span className="max-w-[150px] truncate" title={req}>{req}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemovePreReq(idx)}
                                                className="text-slate-400 hover:text-red-500 ml-1 flex-shrink-0"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {preReqList.length > maxVisiblePreReqs && (
                                    <button 
                                        type="button"
                                        onClick={() => setIsPreReqExpanded(!isPreReqExpanded)}
                                        className="w-full flex items-center justify-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 hover:bg-slate-100 py-1 rounded transition-colors"
                                    >
                                        {isPreReqExpanded ? (
                                            <>Mostrar menos <ChevronUp className="w-3 h-3" /></>
                                        ) : (
                                            <>Ver mais {hiddenCount} itens <ChevronDown className="w-3 h-3" /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Row 3: Descrição & Resultado Esperado */}
                    <div>
                        <label className={labelClass}>Descrição do Teste</label>
                        <textarea 
                            rows={4}
                            value={formData.condition}
                            onChange={(e) => handleInputChange('condition', e.target.value)}
                            className={inputClass}
                            placeholder={`DADO que estou na tela de Aprovação;
QUANDO acesso uma solicitação;
E seleciono um item;
E seleciono a opção Aprovar;`}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Resultado Esperado / Critério de Aceitação</label>
                        <textarea 
                            rows={4}
                            value={formData.expectedResult}
                            onChange={(e) => handleInputChange('expectedResult', e.target.value)}
                            className={inputClass}
                            placeholder="Ex: ENTÃO o item deve ser aprovado com sucesso"
                        />
                    </div>
                </div>

                {/* STEPS SECTION */}
                <div className="border-t border-slate-100 pt-8 mt-4">
                    <div className="flex justify-between items-center mb-5">
                         <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Play className="w-4 h-4 text-emerald-500" /> Execução do Teste
                         </h3>
                         {!isTestStarted && (
                             <button 
                                type="button"
                                onClick={handleStartTest}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                             >
                                <Play className="w-3 h-3 fill-current" /> Iniciar Steps
                             </button>
                         )}
                    </div>

                    {isTestStarted && (
                        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            {steps.map((step, index) => (
                                <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group transition-all hover:shadow-md hover:border-slate-300">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded mt-1 flex-shrink-0 shadow-sm">
                                            STEP {step.stepNumber}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <textarea
                                                value={step.description}
                                                onChange={(e) => handleStepDescriptionChange(index, e.target.value)}
                                                className={inputClass}
                                                rows={2}
                                                placeholder="Descreva o passo executado..."
                                            />
                                            
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100">
                                                    <ImageIcon className="w-4 h-4" />
                                                    {step.imageUrl ? 'Trocar Imagem' : 'Upload'}
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={(e) => handleStepImageUpload(index, e)}
                                                    />
                                                </label>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => handlePasteStepImage(index)}
                                                    className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                                                >
                                                    <Clipboard className="w-4 h-4" />
                                                    Colar Print
                                                </button>

                                                {step.imageUrl && (
                                                     <>
                                                     <button 
                                                        type="button"
                                                        onClick={() => handleEditExistingImage(index)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                                                     >
                                                        <Crop className="w-3 h-3" /> Editar
                                                     </button>
                                                     <button 
                                                        type="button"
                                                        onClick={() => handleRemoveStepImage(index)}
                                                        className="text-red-500 text-xs hover:text-red-700 font-medium ml-1 px-2"
                                                     >
                                                        <Trash2 className="w-4 h-4" />
                                                     </button>
                                                     </>
                                                )}
                                            </div>

                                            {step.imageUrl && (
                                                <div className="mt-3 relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group-image">
                                                    <img src={step.imageUrl} alt={`Step ${step.stepNumber}`} className="w-full h-full object-contain p-2" />
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveStep(index)}
                                            className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all"
                                            title="Remover passo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button 
                                type="button"
                                onClick={handleAddStep}
                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Adicionar Próximo Passo
                            </button>
                        </div>
                    )}
                </div>

                {/* FOOTER RESULT */}
                <div className="md:col-span-2 pt-6 border-t border-slate-100">
                        <label className={labelClass}>Resultado Final do Caso</label>
                        <div className="flex gap-4">
                            {['Sucesso', 'Falha', 'Impedimento', 'Pendente'].map((res) => (
                                <button
                                    key={res}
                                    type="button"
                                    onClick={() => handleInputChange('result', res)}
                                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                                        formData.result === res 
                                        ? res === 'Sucesso' ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200 ring-2 ring-emerald-100'
                                        : res === 'Falha' ? 'bg-red-600 text-white border-red-600 shadow-red-200 ring-2 ring-red-100'
                                        : res === 'Impedimento' ? 'bg-amber-500 text-white border-amber-500 shadow-amber-200 ring-2 ring-amber-100'
                                        : 'bg-slate-500 text-white border-slate-500 shadow-slate-200 ring-2 ring-slate-100'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                >
                                    {res === 'Sucesso' && <CheckCircle className="w-4 h-4" />}
                                    {res === 'Falha' && <XCircle className="w-4 h-4" />}
                                    {res === 'Impedimento' && <AlertTriangle className="w-4 h-4" />}
                                    {res === 'Pendente' && <Clock className="w-4 h-4" />}
                                    {res}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason Field (Conditional) */}
                    {(formData.result === 'Falha' || formData.result === 'Impedimento') && (
                         <div className="md:col-span-2 mt-4 animate-fade-in">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider ml-1 flex items-center gap-1">
                                 <AlertTriangle className="w-3 h-3 text-red-500" />
                                 Informe o motivo do {formData.result}
                            </label>
                            <textarea
                                rows={2}
                                value={formData.failureReason || ''}
                                onChange={(e) => handleInputChange('failureReason', e.target.value)}
                                className={`${inputClass} border-red-200 bg-red-50/30 focus:border-red-500 focus:ring-red-200`}
                                placeholder="Descreva o motivo..."
                            />
                         </div>
                    )}

            </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-50 px-8 py-5 border-t border-slate-200 flex justify-end items-center gap-4">
            <button 
                type="button"
                onClick={handleClose}
                className="text-slate-600 hover:text-slate-800 px-5 py-2.5 rounded-xl hover:bg-slate-200/50 transition-colors text-sm font-semibold"
            >
                Cancelar
            </button>

            <button 
                type="button"
                onClick={handleSave}
                className="bg-slate-900 text-white hover:bg-black px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
                <CheckCircle className="w-4 h-4" />
                {isEditMode ? 'Atualizar Caso' : 'Salvar Caso'}
            </button>
        </div>
    </div>
    </>
  );
};

export default TestScenarioWizard;