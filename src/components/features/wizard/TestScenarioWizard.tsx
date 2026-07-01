import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { TestCaseDetails, EvidenceItem, TestStatus, Severity, TicketInfo, TestStep, TicketPriority } from '@/types';
import { Play, CheckCircle, XCircle, AlertTriangle, X, Layers, Monitor, Info, Pencil, Plus, Image as ImageIcon, Trash2, ChevronDown, ChevronUp, Fingerprint, Clock, Crop, Clipboard, ArrowUp, ArrowDown, Loader2, Square, Save, Sparkles } from 'lucide-react';
import { WizardTriggerContext } from '@/App';
import ImageEditor from '@/components/common/ImageEditor';
import GherkinEditor from '@/components/common/GherkinEditor';
import { generateTestCaseFromStory } from '@/services/geminiService';

interface TestScenarioWizardProps {
    onSave: (items: Omit<EvidenceItem, 'createdBy'>[], isAutoSave?: boolean) => Promise<{ success: boolean; error?: string }>;
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

const TestScenarioWizard = forwardRef<any, TestScenarioWizardProps>(({ onSave, baseTicketInfo, wizardTrigger, onClearTrigger, existingEvidences = [] }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDraftId, setCurrentDraftId] = useState(crypto.randomUUID());
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [currentScenarioNum, setCurrentScenarioNum] = useState(1);
    const [caseNumOverride, setCaseNumOverride] = useState<number | null>(null);
    const [isPreReqExpanded, setIsPreReqExpanded] = useState(false);

    // Image Editor State
    const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
    const [editorInitialTool, setEditorInitialTool] = useState<'CROP' | 'BOX'>('CROP');
    const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiStory, setAiStory] = useState("");
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    const handleGenerateFromAI = async () => {
        if (!aiStory.trim()) return;
        setIsGeneratingAI(true);
        try {
            const result = await generateTestCaseFromStory(aiStory);
            
            setFormData(prev => ({
                ...prev,
                screen: result.screen || prev.screen,
                objective: result.objective || prev.objective,
                condition: result.description || prev.condition,
                expectedResult: result.expectedResult || prev.expectedResult
            }));
            
            setAiStory("");
            setIsAIModalOpen(false);
        } catch (error) {
            console.error("Erro ao gerar história:", error);
            alert("Não foi possível gerar o cenário de teste. Tente novamente.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

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
                setCurrentDraftId(wizardTrigger.evidenceId || crypto.randomUUID());
                setFormData({ ...wizardTrigger.existingDetails });
                if (wizardTrigger.existingDetails.steps && wizardTrigger.existingDetails.steps.length > 0) {
                    setSteps(wizardTrigger.existingDetails.steps);
                    setIsTestStarted(true);
                } else {
                    setSteps([]);
                    setIsTestStarted(false);
                }
            } else {
                setCurrentDraftId(crypto.randomUUID());
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
            setFormData(prev => ({ ...prev, caseId: prev.caseId || generateCaseId() }));
            setCaseNumOverride(null);
        }
    }, [isOpen, wizardTrigger]);

    const handleOpen = () => {
        let nextScenario = 1;
        if (existingEvidences.length > 0) {
            const scenarios = existingEvidences
                .filter(e => e.testCaseDetails && e.testCaseDetails.scenarioNumber !== undefined && e.testCaseDetails.scenarioNumber !== null)
                .map(e => Number(e.testCaseDetails!.scenarioNumber))
                .filter(n => !isNaN(n));

            if (scenarios.length > 0) {
                nextScenario = Math.max(...scenarios) + 1;
            }
        }
        setCurrentScenarioNum(nextScenario);
        setIsOpen(true);
    };

    const resetForm = () => {
        setCurrentDraftId(crypto.randomUUID());
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
        setEditorInitialTool('CROP');
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
                setEditorImageSrc(src);
                setEditorInitialTool('CROP'); // Default to crop for new uploads
                setEditingStepIndex(index);
            };
            reader.readAsDataURL(file);
        }
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
                            setEditorInitialTool('CROP'); // Default to crop for pasted images
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
        setEditorInitialTool('CROP');
        setEditingStepIndex(null);
    };

    const handleEditorCancel = () => {
        setEditorImageSrc(null);
        setEditorInitialTool('CROP');
        setEditingStepIndex(null);
    };

    const handleEditExistingImage = (index: number, initialTool: 'CROP' | 'BOX' = 'CROP') => {
        const currentImg = steps[index].imageUrl;
        if (currentImg) {
            setEditorImageSrc(currentImg);
            setEditorInitialTool(initialTool);
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

    const handleMoveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === steps.length - 1) return;

        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

        const reindexedSteps = newSteps.map((s, i) => ({
            ...s,
            stepNumber: i + 1
        }));

        setSteps(reindexedSteps);
    };

    const handleClose = () => {
        setIsOpen(false);
        if (onClearTrigger) onClearTrigger();
        resetForm();
        setCaseNumOverride(null);
        setSaveError(null);
        setIsSaving(false);
    };

    const getDraftData = () => {
        if (!isOpen) return null;

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
        const isEditMode = wizardTrigger?.mode === 'edit';

        return {
            id: currentDraftId,
            title: `Cenário de Teste ${testDetails.scenarioNumber}: ${testDetails.screen}`,
            description: testDetails.objective,
            imageUrl: steps.length > 0 ? steps[steps.length - 1].imageUrl || null : null,
            status: status,
            severity: severity,
            timestamp: Date.now(),
            testCaseDetails: testDetails,
            ticketInfo: sourceTicketInfo || {} as TicketInfo
        };
    };

    useImperativeHandle(ref, () => ({
        getDraft: getDraftData,
        isOpen: () => isOpen
    }));

    const handleAutoSave = async () => {
        if (isSaving || !isOpen) return;
        const draft = getDraftData();
        if (!draft) return;
        
        // Don't auto-save if completely empty
        if (!draft.testCaseDetails.screen && !draft.testCaseDetails.objective && (!draft.testCaseDetails.steps || draft.testCaseDetails.steps.length === 0)) {
            return;
        }

        setAutoSaveStatus('saving');
        try {
            const result = await onSave([draft], true); // true for isAutoSave
            if (result.success) {
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus('idle'), 2000);
            } else {
                setAutoSaveStatus('idle');
            }
        } catch (err) {
            setAutoSaveStatus('idle');
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            handleAutoSave();
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData, steps, isOpen, preReqInput]);

    const handleSave = async () => {
        setSaveError(null);
        setIsSaving(true);

        const draft = getDraftData();
        if (!draft) {
            setIsSaving(false);
            return;
        }

        try {
            const result = await onSave([draft]);
            if (!result.success) {
                setSaveError(result.error || "Erro desconhecido ao salvar caso de teste.");
                return;
            }

            if (wizardTrigger) {
                handleClose();
            } else {
                resetForm();
                setIsOpen(false);
            }
        } catch (err: any) {
            setSaveError(err.message || "Falha na requisição. Tente novamente.");
        } finally {
            setIsSaving(false);
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
                    initialTool={editorInitialTool}
                    onSave={handleEditorSave}
                    onCancel={handleEditorCancel}
                />
            )}

            {/* AI STORY MODAL */}
            {isAIModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setIsAIModalOpen(false)}>
                    <div 
                        className="bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-2xl overflow-hidden animate-zoom-in border border-slate-200/60 relative flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header do Modal */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 to-indigo-600 absolute top-0 left-0"></div>
                        <div className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer p-2 hover:bg-slate-100 rounded-full transition-all" onClick={() => setIsAIModalOpen(false)}>
                            <X className="w-5 h-5" />
                        </div>
                        
                        <div className="p-8 pb-6 border-b border-slate-100 flex items-center gap-4">
                            <div className="bg-violet-100 p-3.5 rounded-2xl text-violet-600 relative">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                                <div className="absolute inset-0 bg-violet-400/20 rounded-2xl animate-ping"></div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Conte sua História</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">
                                    Descreva o passo a passo ou objetivo do teste e deixe a IA preencher tudo para você.
                                </p>
                            </div>
                        </div>

                        {/* Body do Modal */}
                        <div className="p-8 pt-6 bg-slate-50/50 flex-1">
                            <textarea
                                value={aiStory}
                                onChange={(e) => setAiStory(e.target.value)}
                                placeholder="Ex: Eu abro a tela de clientes, clico no botão novo, preencho os dados e espero que o cadastro seja salvo com sucesso..."
                                className="w-full h-48 rounded-xl border border-slate-300 bg-white p-4 text-slate-700 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none shadow-sm font-medium"
                            />
                        </div>

                        {/* Footer do Modal */}
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAIModalOpen(false)}
                                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateFromAI}
                                disabled={isGeneratingAI || !aiStory.trim()}
                                className="group relative flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all active:scale-95 border border-violet-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingAI ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Gerando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                        <span>Gerar Caso</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-lg ring-1 ring-black/5 animate-slide-down transition-all duration-300">
                {/* Header */}
                <div className={`px-5 py-3 border-b flex justify-between items-center ${wizardTrigger ? 'bg-blue-50/80 border-blue-100' : 'bg-indigo-50/80 border-indigo-100'} backdrop-blur-sm gap-4`}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="shrink-0 hidden sm:block">
                            <h2 className={`text-base font-bold flex items-center gap-2 ${wizardTrigger ? 'text-blue-900' : 'text-indigo-900'}`}>
                                {isEditMode ? <Pencil className="w-4 h-4 text-blue-600" /> : <Layers className={`${wizardTrigger ? 'text-blue-600' : 'text-indigo-600'} w-4 h-4`} />}
                                {isEditMode ? 'Editar Caso' : (wizardTrigger ? 'Adicionar' : 'Assistente')}
                            </h2>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                {isEditMode ? 'Atualize o caso.' : 'Preenchimento rápido.'}
                            </p>
                        </div>

                        <div className="h-8 w-px bg-indigo-200/50 hidden md:block shrink-0"></div>

                        {/* TELA DE TESTE NO CABEÇALHO */}
                        <div className="flex-1 max-w-sm min-w-[120px]">
                            <div className="flex items-center bg-white/90 rounded-full border border-indigo-100/80 p-0.5 pr-2 shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all group cursor-text" onClick={(e) => { const input = e.currentTarget.querySelector('input'); if(input) input.focus(); }}>
                                <div className="bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm shrink-0 group-focus-within:bg-indigo-600 transition-colors">
                                    <Monitor className="w-3 h-3" /> Tela
                                </div>
                                <input
                                    type="text"
                                    value={formData.screen}
                                    onChange={(e) => handleInputChange('screen', e.target.value)}
                                    onKeyDown={preventSubmit}
                                    className="w-full bg-transparent border-none text-indigo-900 px-2 py-0.5 text-xs font-bold placeholder-indigo-300 focus:ring-0 outline-none"
                                    placeholder="Qual a tela? (ex: Clientes)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* CENTERED BADGES */}
                    <div className="hidden lg:flex items-center justify-center gap-4 shrink-0 pointer-events-none">
                        <div className="flex items-center bg-indigo-50 rounded-full border border-indigo-100/80 p-0.5 pr-3 shadow-sm transition-all">
                            <div className="bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full mr-2 shadow-sm">
                                Cenário
                            </div>
                            <span className="text-indigo-900 font-bold text-sm">#{currentScenarioNum}</span>
                        </div>

                        <div className="flex items-center bg-blue-50 rounded-full border border-blue-100/80 p-0.5 pr-3 shadow-sm transition-all">
                            <div className="bg-blue-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full mr-2 shadow-sm">
                                Caso
                            </div>
                            <span className="text-blue-900 font-bold text-sm flex items-center gap-1.5">
                                #{caseNumOverride || 1}
                                {wizardTrigger && !isEditMode && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full tracking-wide font-bold shadow-sm animate-pulse">+NOVO</span>}
                                {isEditMode && <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full tracking-wide font-bold shadow-sm">EDIT</span>}
                            </span>
                        </div>

                        <div className="flex items-center bg-slate-50 rounded-full border border-slate-200/80 p-0.5 pr-3 shadow-sm transition-all">
                            <div className="bg-slate-600 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full mr-2 shadow-sm flex items-center gap-1">
                                <Fingerprint className="w-3 h-3" /> ID
                            </div>
                            <span className="font-mono text-slate-700 font-bold text-xs flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {formData.caseId}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 md:gap-4 flex-1 shrink-0">
                        {/* AI BUTTON */}
                        <button
                            type="button"
                            onClick={() => setIsAIModalOpen(true)}
                            className="group relative flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all active:scale-95 border border-violet-400/50"
                        >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span className="hidden sm:inline">Preencher com IA</span>
                            <span className="inline sm:hidden">IA</span>
                            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>

                        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-lg transition-colors relative z-20"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 bg-white">
                    <div className="space-y-6 animate-fade-in">

                        {/* Form Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                            
                            {/* Row 1: Tela de Teste (MOBILE ONLY) */}
                            <div className="md:col-span-2 lg:hidden">
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
                                <GherkinEditor
                                    rows={3}
                                    value={formData.objective || ''}
                                    onChange={(val) => handleInputChange('objective', val)}
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
                                                    <span title={req}>{req}</span>
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
                                <GherkinEditor
                                    rows={4}
                                    value={formData.condition || ''}
                                    onChange={(val) => handleInputChange('condition', val)}
                                    className={inputClass}
                                    placeholder={`DADO que estou na tela de Aprovação;\nQUANDO acesso uma solicitação;\nE seleciono um item;\nE seleciono a opção Aprovar;`}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Resultado Esperado / Critério de Aceitação</label>
                                <GherkinEditor
                                    rows={4}
                                    value={formData.expectedResult || ''}
                                    onChange={(val) => handleInputChange('expectedResult', val)}
                                    className={inputClass}
                                    placeholder="Ex: ENTÃO o item deve ser aprovado com sucesso"
                                />
                            </div>
                        </div>

                        {/* STEPS SECTION */}
                        <div className="border-t border-slate-100 pt-8 mt-4">
                            <div className="flex justify-center items-center mb-5">
                                {!isTestStarted && (
                                    <button
                                        type="button"
                                        onClick={handleStartTest}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wide px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 transform hover:scale-[1.02] active:scale-95"
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
                                                {/* Step Indicator */}
                                                <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded mt-1 flex-shrink-0 shadow-sm">
                                                    STEP {step.stepNumber}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 space-y-3">
                                                    <GherkinEditor
                                                        value={step.description || ''}
                                                        onChange={(val) => handleStepDescriptionChange(index, val)}
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
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditExistingImage(index, 'CROP')}
                                                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100 shadow-sm"
                                                                >
                                                                    <Crop className="w-3.5 h-3.5" /> Cortar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEditExistingImage(index, 'BOX')}
                                                                    className="text-red-600 hover:text-red-800 text-xs font-bold flex items-center gap-1.5 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all border border-red-100 shadow-sm"
                                                                >
                                                                    <Square className="w-3.5 h-3.5" /> Destacar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleSave}
                                                                    className="text-emerald-600 hover:text-emerald-800 text-xs font-bold flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all border border-emerald-100 shadow-sm"
                                                                    title="Salvar alterações do caso"
                                                                >
                                                                    <Save className="w-3.5 h-3.5" /> Salvar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveStepImage(index)}
                                                                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                                                                    title="Remover Imagem"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {step.imageUrl && (
                                                        <div className="mt-3 relative w-full h-48 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group-image">
                                                            <img src={step.imageUrl} alt={`Step ${step.stepNumber}`} className="w-full h-full object-contain p-2" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons (Right Side) */}
                                                <div className="flex flex-col gap-1">
                                                    {/* Move Up */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveStep(index, 'up')}
                                                        disabled={index === 0}
                                                        className={`p-1.5 rounded-md transition-colors ${index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                                                        title="Mover para cima"
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>

                                                    {/* Move Down */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveStep(index, 'down')}
                                                        disabled={index === steps.length - 1}
                                                        className={`p-1.5 rounded-md transition-colors ${index === steps.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                                                        title="Mover para baixo"
                                                    >
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveStep(index)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all mt-1"
                                                        title="Remover passo"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
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
                                        className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${formData.result === res
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

                        {saveError && (
                            <div className="md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-bold flex items-center gap-2 animate-shake">
                                <AlertTriangle className="w-4 h-4" /> {saveError}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="bg-slate-50 px-8 py-5 border-t border-slate-200 flex justify-between items-center gap-4">
                    <div className="flex items-center text-xs font-bold text-slate-500 min-w-[150px]">
                        {autoSaveStatus === 'saving' && <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</span>}
                        {autoSaveStatus === 'saved' && <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Salvo</span>}
                    </div>
                    <div className="flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-slate-600 hover:text-slate-800 px-5 py-2.5 rounded-xl hover:bg-slate-200/50 transition-colors text-sm font-semibold"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
});

export default TestScenarioWizard;
