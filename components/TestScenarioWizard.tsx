
import React, { useState, useEffect, useRef } from 'react';
import { TestCaseDetails, EvidenceItem, TestStatus, Severity, TicketInfo, TestStep } from '../types';
import { Play, CheckCircle, XCircle, AlertTriangle, X, Layers, Monitor, Info, Pencil, Plus, Image as ImageIcon, Trash2 } from 'lucide-react';
import { WizardTriggerContext } from '../App';

interface TestScenarioWizardProps {
  onSave: (items: EvidenceItem[]) => void;
  baseTicketInfo?: TicketInfo;
  wizardTrigger?: WizardTriggerContext | null;
  onClearTrigger?: () => void;
}

const generateCaseId = () => {
  // Gera um ID no formato QA-XXXXX (5 dígitos numéricos aleatórios)
  const randomNum = Math.floor(Math.random() * 90000) + 10000;
  return `QA-${randomNum}`;
};

// Estilo padronizado para inputs (Dark Theme igual ao EvidenceForm)
const inputClass = "w-full rounded-lg border-gray-600 bg-gray-800 text-gray-100 px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none";
const labelClass = "block text-xs font-medium text-gray-700 mb-1";

const TestScenarioWizard: React.FC<TestScenarioWizardProps> = ({ onSave, baseTicketInfo, wizardTrigger, onClearTrigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScenarioNum, setCurrentScenarioNum] = useState(1);
  // Case number local para exibição, pode ser automático ou vindo do trigger
  const [caseNumOverride, setCaseNumOverride] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<TestCaseDetails>>({
    caseId: generateCaseId(),
    result: 'Sucesso',
    screen: '',
    objective: '',
    preRequisite: '',
    condition: '',
    expectedResult: ''
  });

  // Steps State
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [steps, setSteps] = useState<TestStep[]>([]);

  // Monitora o gatilho externo (Botão Novo Caso ou Editar da Lista)
  useEffect(() => {
    if (wizardTrigger) {
      setIsOpen(true);
      setCurrentScenarioNum(wizardTrigger.scenarioNumber);
      setCaseNumOverride(wizardTrigger.nextCaseNumber);

      if (wizardTrigger.mode === 'edit' && wizardTrigger.existingDetails) {
        // Modo Edição: Preenche com os dados existentes
        setFormData({
          ...wizardTrigger.existingDetails
        });
        // Carrega os steps se existirem
        if (wizardTrigger.existingDetails.steps && wizardTrigger.existingDetails.steps.length > 0) {
            setSteps(wizardTrigger.existingDetails.steps);
            setIsTestStarted(true);
        } else {
            setSteps([]);
            setIsTestStarted(false);
        }
      } else {
        // Modo Criação/Adição: Gera novo ID
        setFormData(prev => ({ 
          ...prev, 
          caseId: generateCaseId(),
          screen: '',
          objective: '',
          preRequisite: '',
          condition: '',
          expectedResult: '',
          result: 'Sucesso'
        }));
        setSteps([]);
        setIsTestStarted(false);
      }
    }
  }, [wizardTrigger]);

  useEffect(() => {
    if (isOpen && !wizardTrigger) {
        // Se abriu manualmente (novo cenário do zero), garante novo ID
       setFormData(prev => ({...prev, caseId: prev.caseId || generateCaseId()}));
       setCaseNumOverride(null);
    }
  }, [isOpen, wizardTrigger]);

  const resetForm = () => {
    setFormData({
      caseId: generateCaseId(),
      result: 'Sucesso',
      screen: '',
      objective: '',
      preRequisite: '',
      condition: '',
      expectedResult: ''
    });
    setSteps([]);
    setIsTestStarted(false);
  };

  const handleInputChange = (field: keyof TestCaseDetails, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- Steps Logic ---

  const handleStartTest = () => {
    setIsTestStarted(true);
    if (steps.length === 0) {
        setSteps([{ stepNumber: 1, description: '' }]);
    }
  };

  const handleAddStep = () => {
    setSteps(prev => [
        ...prev, 
        { stepNumber: prev.length + 1, description: '' }
    ]);
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
            const newSteps = [...steps];
            newSteps[index].imageUrl = reader.result as string;
            setSteps(newSteps);
        };
        reader.readAsDataURL(file);
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

  // --- Save Logic ---

  const handleClose = () => {
    setIsOpen(false);
    if (onClearTrigger) onClearTrigger();
    resetForm();
    setCaseNumOverride(null);
  };

  const handleSave = () => {
    // Se tiver trigger, usa o número do caso fornecido, senão é sempre o caso 1 de um novo cenário
    const caseNumberToUse = caseNumOverride || 1;

    // Mapeia TestCaseDetails garantindo valores default para evitar erros
    const testDetails: TestCaseDetails = {
        scenarioNumber: currentScenarioNum,
        caseNumber: caseNumberToUse,
        caseId: formData.caseId || generateCaseId(),
        screen: formData.screen || 'N/A',
        result: (formData.result as any) || 'Sucesso',
        objective: formData.objective || 'N/A',
        preRequisite: formData.preRequisite || 'N/A',
        condition: formData.condition || 'N/A',
        expectedResult: formData.expectedResult || 'N/A',
        steps: steps.length > 0 ? steps : undefined
    };

    // Define status/severity baseado no resultado
    let status = TestStatus.PASS;
    let severity = Severity.LOW;
    
    if (testDetails.result === 'Fracassou') {
        status = TestStatus.FAIL;
        severity = Severity.HIGH;
    } else if (testDetails.result === 'Impedimento') {
        status = TestStatus.BLOCKED;
        severity = Severity.MEDIUM;
    }

    // Se tiver trigger, usa as infos do ticket que vieram de lá, senão usa o baseTicketInfo
    const sourceTicketInfo = wizardTrigger ? wizardTrigger.ticketInfo : baseTicketInfo;

    // Ticket Default caso nada tenha sido passado
    const defaultTicketInfo: TicketInfo = {
        ticketId: 'N/A',
        ticketTitle: `Cenário de Teste #${testDetails.scenarioNumber}`,
        sprint: 'N/A',
        ticketSummary: 'Cenário de Teste',
        clientSystem: 'N/A',
        requester: 'QA',
        analyst: 'QA',
        requestDate: new Date().toISOString().split('T')[0],
        environment: 'N/A',
        environmentVersion: 'N/A',
        evidenceDate: new Date().toISOString().split('T')[0],
        ticketDescription: '',
        solution: ''
    };

    const ticketInfoToUse: TicketInfo = sourceTicketInfo ? { 
        ...sourceTicketInfo,
        // Fallbacks caso os campos base estejam vazios
        ticketId: sourceTicketInfo.ticketId || defaultTicketInfo.ticketId,
        ticketTitle: sourceTicketInfo.ticketTitle || defaultTicketInfo.ticketTitle,
    } : defaultTicketInfo;

    const isEditMode = wizardTrigger?.mode === 'edit';

    const newItem: EvidenceItem = {
        id: isEditMode && wizardTrigger?.evidenceId ? wizardTrigger.evidenceId : crypto.randomUUID(),
        title: `Cenário de Teste ${testDetails.scenarioNumber}: ${testDetails.screen}`,
        description: testDetails.objective, 
        imageUrl: steps.length > 0 ? steps[steps.length-1].imageUrl || null : null, // Usa a imagem do último passo como capa se houver
        status: status,
        severity: severity,
        timestamp: Date.now(), 
        testCaseDetails: testDetails,
        ticketInfo: ticketInfoToUse
    };

    // Salva imediatamente e fecha (minimiza)
    onSave([newItem]);
    
    if (wizardTrigger) {
        // Se for inclusão de caso ou edição via trigger, apenas fecha
        handleClose();
    } else {
        // Se for fluxo normal de criar cenários (novo fluxo), avança para o próximo
        setCurrentScenarioNum(prev => prev + 1);
        resetForm();
        setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
        <button 
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.01] active:scale-95 w-full md:w-auto"
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full transition-transform group-hover:translate-y-0 duration-300"></div>
            <div className="relative flex items-center justify-center gap-3 font-semibold tracking-wide">
                <Play className="w-5 h-5 fill-current" />
                Novo Cenário de Teste
            </div>
        </button>
    );
  }

  const isEditMode = wizardTrigger?.mode === 'edit';

  return (
    <div className="w-full bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-sm animate-slide-down transition-all duration-300">
        
        {/* Header Inline */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${wizardTrigger ? 'bg-blue-50 border-blue-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
            <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${wizardTrigger ? 'text-blue-800' : 'text-gray-800'}`}>
                    {isEditMode ? <Pencil className="w-5 h-5 text-blue-600" /> : <Layers className={`${wizardTrigger ? 'text-blue-600' : 'text-indigo-600'} w-5 h-5`} />}
                    {isEditMode ? 'Editar Caso de Teste' : (wizardTrigger ? 'Adicionar Caso ao Cenário' : 'Assistente de Cenários')}
                </h2>
                <p className="text-xs text-gray-500">
                    {isEditMode 
                     ? 'Atualize as informações do caso existente.' 
                     : (wizardTrigger ? 'Adicionando novo caso de teste ao cenário existente.' : 'Preenchimento rápido de casos de teste.')}
                </p>
            </div>
            
            <button 
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Body Inline */}
        <div className="p-6 bg-white">
            <div className="space-y-6 animate-fade-in">
                {/* Status Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Cenário</span>
                        <div className="text-xl font-bold text-indigo-600">#{currentScenarioNum}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Caso</span>
                        <div className="text-xl font-bold text-blue-600 flex items-center gap-1">
                            #{caseNumOverride || 1}
                            {wizardTrigger && !isEditMode && <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded">+ Novo</span>}
                            {isEditMode && <span className="text-[10px] bg-orange-100 text-orange-800 px-1 rounded">Edit</span>}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">ID Gerado</span>
                        <div className="text-sm font-mono text-gray-700 mt-1 font-semibold">{formData.caseId}</div>
                    </div>
                </div>

                {/* Form Principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Tela de Teste / Contexto</label>
                        <div className="relative">
                            <Monitor className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                value={formData.screen}
                                onChange={(e) => handleInputChange('screen', e.target.value)}
                                className={`${inputClass} pl-10`}
                                placeholder="Ex: Tela de Login"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Objetivo / Funcionalidade</label>
                        <textarea 
                            rows={3}
                            value={formData.objective}
                            onChange={(e) => handleInputChange('objective', e.target.value)}
                            className={inputClass}
                            placeholder="Objetivo do teste..."
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Resultado Esperado</label>
                        <textarea 
                            rows={3}
                            value={formData.expectedResult}
                            onChange={(e) => handleInputChange('expectedResult', e.target.value)}
                            className={inputClass}
                            placeholder="Comportamento esperado..."
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Pré-Requisito</label>
                        <input 
                            type="text"
                            value={formData.preRequisite}
                            onChange={(e) => handleInputChange('preRequisite', e.target.value)}
                            className={inputClass}
                            placeholder="Ex: Usuário logado"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Condição</label>
                        <input 
                            type="text"
                            value={formData.condition}
                            onChange={(e) => handleInputChange('condition', e.target.value)}
                            className={inputClass}
                            placeholder="Ex: Dados válidos"
                        />
                    </div>
                </div>

                {/* STEPS SECTION (TEST EXECUTION) */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <Play className="w-4 h-4 text-green-600" /> Execução do Teste
                         </h3>
                         {!isTestStarted && (
                             <button 
                                type="button"
                                onClick={handleStartTest}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 animate-pulse"
                             >
                                <Play className="w-4 h-4 fill-current" /> Iniciar Teste
                             </button>
                         )}
                    </div>

                    {isTestStarted && (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            {steps.map((step, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative group animate-fade-in">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded mt-1 flex-shrink-0">
                                            Step #{step.stepNumber}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <textarea
                                                value={step.description}
                                                onChange={(e) => handleStepDescriptionChange(index, e.target.value)}
                                                className={inputClass}
                                                rows={2}
                                                placeholder="Descreva o passo executado..."
                                            />
                                            
                                            <div className="flex items-center gap-3">
                                                <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors border border-blue-200">
                                                    <ImageIcon className="w-4 h-4" />
                                                    {step.imageUrl ? 'Trocar Imagem' : 'Adicionar Evidência'}
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={(e) => handleStepImageUpload(index, e)}
                                                    />
                                                </label>
                                                {step.imageUrl && (
                                                     <button 
                                                        type="button"
                                                        onClick={() => handleRemoveStepImage(index)}
                                                        className="text-red-500 text-xs hover:underline"
                                                     >
                                                        Remover imagem
                                                     </button>
                                                )}
                                            </div>

                                            {step.imageUrl && (
                                                <div className="mt-2 relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={step.imageUrl} alt={`Step ${step.stepNumber}`} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveStep(index)}
                                            className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
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
                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Adicionar Próximo Passo
                            </button>
                        </div>
                    )}
                </div>

                {/* RESULTADO FINAL (FOOTER DO FORM) */}
                <div className="md:col-span-2 pt-2 border-t border-gray-100">
                        <label className={labelClass}>Resultado Final do Caso</label>
                        <div className="flex gap-3">
                            {['Sucesso', 'Fracassou', 'Impedimento'].map((res) => (
                                <button
                                    key={res}
                                    type="button"
                                    onClick={() => handleInputChange('result', res)}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                        formData.result === res 
                                        ? res === 'Sucesso' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500'
                                        : res === 'Fracassou' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                                        : 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {res === 'Sucesso' && <CheckCircle className="w-3 h-3" />}
                                    {res === 'Fracassou' && <XCircle className="w-3 h-3" />}
                                    {res === 'Impedimento' && <AlertTriangle className="w-3 h-3" />}
                                    {res}
                                </button>
                            ))}
                        </div>
                    </div>

            </div>
        </div>

        {/* Footer Inline */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end items-center gap-3">
            <button 
                type="button"
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
                Cancelar
            </button>

            <button 
                type="button"
                onClick={handleSave}
                className="bg-gray-800 text-white hover:bg-gray-900 px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg"
            >
                <CheckCircle className="w-4 h-4" />
                {isEditMode ? 'Atualizar Caso' : 'Salvar Caso'}
            </button>
        </div>
    </div>
  );
};

export default TestScenarioWizard;
