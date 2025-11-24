
import React, { useState, useEffect } from 'react';
import { Bug, Save, AlertCircle, CheckCircle2, ChevronDown, Calendar, User, Monitor, Server, FileText, MessageSquare, Box, ClipboardList, Eye, Pencil, Trash2, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { BugReport, BugStatus, BugPriority } from '../types';

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

const PRIORITY_SELECT_STYLES = {
    'Alta': 'text-red-700 bg-red-50 border-red-200 focus:ring-red-500 focus:border-red-500',
    'Média': 'text-amber-700 bg-amber-50 border-amber-200 focus:ring-amber-500 focus:border-amber-500',
    'Baixa': 'text-blue-700 bg-blue-50 border-blue-200 focus:ring-blue-500 focus:border-blue-500'
};

const BugReportForm: React.FC<BugReportFormProps> = ({ onSave, userAcronym, userName, bugs = [], onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<BugStatus>(BugStatus.PENDING);
  const [priority, setPriority] = useState<BugPriority>('Média');
  
  const [screen, setScreen] = useState('');
  const [module, setModule] = useState('');
  const [environment, setEnvironment] = useState('');
  const [dev, setDev] = useState('');
  
  // Analyst auto-filled
  const analystName = userName ? `${userAcronym} - ${userName}` : userAcronym;

  const [description, setDescription] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [devFeedback, setDevFeedback] = useState('');
  
  const [date] = useState(getBrazilDateString()); // Read-only for display logic, actual save uses current date

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      environment,
      date: editingId ? date : getBrazilDateString(), // Keep original date on edit, or new date on create
      analyst: analystName,
      dev,
      scenarioDescription,
      expectedResult,
      description,
      devFeedback,
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
      setEnvironment(bug.environment);
      setDev(bug.dev);
      setDescription(bug.description);
      setScenarioDescription(bug.scenarioDescription);
      setExpectedResult(bug.expectedResult);
      setDevFeedback(bug.devFeedback);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setSummary('');
    setStatus(BugStatus.PENDING);
    setPriority('Média');
    setScreen('');
    setModule('');
    setEnvironment('');
    setDev('');
    setDescription('');
    setScenarioDescription('');
    setExpectedResult('');
    setDevFeedback('');
  };

  // Modern Styling
  const inputClass = "w-full rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-3 text-sm placeholder-slate-400 transition-all outline-none shadow-sm";
  const labelClass = "block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider ml-1 flex items-center gap-1.5";

  return (
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
              placeholder="Ex: Botão de Salvar não responde na tela de Login"
              autoFocus={!!editingId}
            />
          </div>
          <div className="md:col-span-3">
             <label className={labelClass}>
               <ActivityIcon status={status} /> Status
             </label>
             <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BugStatus)}
                  className={`${inputClass} appearance-none cursor-pointer font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300 ${
                    status === BugStatus.PENDING ? 'text-slate-600' :
                    status === BugStatus.BLOCKED ? 'text-red-600' :
                    status === BugStatus.IN_TEST ? 'text-blue-600' :
                    'text-amber-600'
                  }`}
                >
                  {Object.values(BugStatus).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             </div>
          </div>
          <div className="md:col-span-3">
             <label className={labelClass}>
               Prioridade
             </label>
             <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as BugPriority)}
                  className={`${inputClass} appearance-none cursor-pointer font-bold border-2 focus:ring-2 ${PRIORITY_SELECT_STYLES[priority]}`}
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50`} />
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
                onChange={(e) => setScreen(e.target.value)}
                className={`${inputClass} focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                placeholder="Ex: Cadastro de Clientes"
              />
           </div>
           <div>
              <label className={labelClass}>
                <Box className="w-3.5 h-3.5 text-slate-400" /> Módulo
              </label>
              <input 
                type="text" 
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className={`${inputClass} focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                placeholder="Ex: Financeiro"
              />
           </div>
           <div>
              <label className={labelClass}>
                <Server className="w-3.5 h-3.5 text-slate-400" /> Ambiente
              </label>
              <input 
                type="text" 
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className={`${inputClass} focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                placeholder="Ex: Homologação v2"
              />
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
                onChange={(e) => setDev(e.target.value)}
                className={`${inputClass} focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-red-300`}
                placeholder="Nome do Desenvolvedor"
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

        <div className="border-t border-slate-100 my-4"></div>

        {/* ROW 5: Error Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="flex flex-col h-full">
              <label className={labelClass}>
                 <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Descrição do Erro
              </label>
              <textarea 
                 rows={6}
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 className={`${inputClass} resize-none h-full bg-red-50/20 focus:ring-2 focus:ring-red-500 focus:border-red-500`}
                 placeholder="Descreva o passo a passo para reproduzir o erro, comportamento atual..."
              />
           </div>

           <div className="flex flex-col h-full">
              <label className={labelClass}>
                 <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Devolutiva do DEV
              </label>
              <textarea 
                 rows={6}
                 value={devFeedback}
                 onChange={(e) => setDevFeedback(e.target.value)}
                 className={`${inputClass} resize-none h-full bg-blue-50/30 border-blue-200 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300`}
                 placeholder="Espaço reservado para o retorno técnico..."
              />
           </div>
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

    {/* LIST SECTION */}
    <div className="space-y-6">
         <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
             <div className="p-2 bg-slate-100 rounded-lg">
                 <ClipboardList className="w-5 h-5 text-slate-600" />
             </div>
             <h3 className="text-xl font-bold text-slate-800">Bugs Registrados</h3>
             <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{bugs.length}</span>
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
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {bugs.map((bug) => (
                     <div 
                         key={bug.id} 
                         onClick={() => handleEdit(bug)}
                         className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group overflow-hidden cursor-pointer"
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
                             </div>
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
                                         onClick={(e) => { e.stopPropagation(); onDelete(bug.id); }}
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
         )}
    </div>

    </div>
  );
};

const ActivityIcon = ({status}: {status: BugStatus}) => {
   if (status === BugStatus.BLOCKED) return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
   if (status === BugStatus.IN_TEST) return <Monitor className="w-3.5 h-3.5 text-blue-500" />;
   return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
};

export default BugReportForm;
