
import React, { useState } from 'react';
import { Bug, Save, AlertCircle, CheckCircle2, ChevronDown, Calendar, User, Monitor, Server, FileText, MessageSquare } from 'lucide-react';
import { BugStatus } from '../types';

interface BugReportFormProps {
  onSave: (bug: any) => void;
  userAcronym: string;
}

const getBrazilDateString = () => {
  const date = new Date();
  const brazilDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  const y = brazilDate.getFullYear();
  const m = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const d = String(brazilDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const BugReportForm: React.FC<BugReportFormProps> = ({ onSave, userAcronym }) => {
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<BugStatus>(BugStatus.PENDING);
  const [screen, setScreen] = useState('');
  const [environment, setEnvironment] = useState('');
  const [dev, setDev] = useState('');
  const [description, setDescription] = useState('');
  const [devFeedback, setDevFeedback] = useState('');
  const [date] = useState(getBrazilDateString()); // Read-only

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !description) {
      setError("Preencha o Resumo e a Descrição do Erro.");
      return;
    }

    const newBug = {
      id: crypto.randomUUID(),
      summary,
      status,
      screen,
      environment,
      date,
      dev,
      description,
      devFeedback,
      createdBy: userAcronym
    };

    // Simulate save
    console.log("Bug Saved:", newBug);
    if (onSave) onSave(newBug);

    setSuccessMsg("Bug registrado com sucesso!");
    setError(null);

    // Reset Form
    setSummary('');
    setStatus(BugStatus.PENDING);
    setScreen('');
    setEnvironment('');
    setDev('');
    setDescription('');
    setDevFeedback('');

    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Modern Styling
  const inputClass = "w-full rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-3 text-sm placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none shadow-sm hover:border-red-300";
  const labelClass = "block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider ml-1 flex items-center gap-1.5";

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-100 bg-red-50/50 px-8 py-5 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-red-100">
              <Bug className="w-5 h-5 text-red-600" />
            </div>
            Registro de BUGs
          </h2>
          <p className="text-sm text-slate-500 mt-1 ml-12">
            Documentação de erros e anomalias encontradas durante o ciclo de testes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        
        {/* ROW 1: Summary & Status */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8">
            <label className={labelClass}>
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Resumo do BUG
            </label>
            <input 
              type="text" 
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={`${inputClass} font-medium`}
              placeholder="Ex: Botão de Salvar não responde na tela de Login"
              autoFocus
            />
          </div>
          <div className="md:col-span-4">
             <label className={labelClass}>
               <ActivityIcon status={status} /> Status Atual
             </label>
             <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BugStatus)}
                  className={`${inputClass} appearance-none cursor-pointer font-bold ${
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
        </div>

        {/* ROW 2: Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div>
              <label className={labelClass}>
                <Monitor className="w-3.5 h-3.5 text-slate-400" /> Tela / Módulo
              </label>
              <input 
                type="text" 
                value={screen}
                onChange={(e) => setScreen(e.target.value)}
                className={inputClass}
                placeholder="Ex: Cadastro de Clientes"
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
                className={inputClass}
                placeholder="Ex: Homologação v2"
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
                className={inputClass}
                placeholder="Nome do Desenvolvedor"
              />
           </div>
        </div>

        {/* ROW 3: Date (Read Only) */}
        <div>
           <label className={labelClass}>
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Data de Registro
           </label>
           <div className="w-full md:w-1/3 relative">
             <input 
               type="text"
               value={date.split('-').reverse().join('/')}
               readOnly
               className={`${inputClass} bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed`}
             />
             <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                AUTO
             </div>
           </div>
        </div>

        <div className="border-t border-slate-100 my-4"></div>

        {/* ROW 4: Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="flex flex-col h-full">
              <label className={labelClass}>
                 <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Descrição do Erro
              </label>
              <textarea 
                 rows={6}
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 className={`${inputClass} resize-none h-full`}
                 placeholder="Descreva o passo a passo para reproduzir o erro, comportamento esperado vs atual..."
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
              Salvar BUG
           </button>
        </div>

      </form>
    </div>
  );
};

const ActivityIcon = ({status}: {status: BugStatus}) => {
   if (status === BugStatus.BLOCKED) return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
   if (status === BugStatus.IN_TEST) return <Monitor className="w-3.5 h-3.5 text-blue-500" />;
   return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
};

export default BugReportForm;
