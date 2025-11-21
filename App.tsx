import React, { useState, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EvidenceForm from './components/EvidenceForm';
import EvidenceList from './components/EvidenceList';
import { EvidenceItem, TicketInfo, TestCaseDetails, ArchivedTicket } from './types';
import { FileCheck, AlertTriangle, Archive, RefreshCw, Calendar, Edit3, ArrowRight, X, User, CheckCheck, FileText } from 'lucide-react';

declare const html2pdf: any;

export interface WizardTriggerContext {
  mode: 'create' | 'edit';
  scenarioNumber: number;
  nextCaseNumber: number;
  ticketInfo: TicketInfo;
  evidenceId?: string;
  existingDetails?: TestCaseDetails;
}

const App: React.FC = () => {
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [ticketHistory, setTicketHistory] = useState<ArchivedTicket[]>([]);
  
  const [formKey, setFormKey] = useState(0);
  const [editingTicketInfo, setEditingTicketInfo] = useState<TicketInfo | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false); // New state for PDF modal
  
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [wizardTrigger, setWizardTrigger] = useState<WizardTriggerContext | null>(null);
  
  const formTicketInfoRef = useRef<TicketInfo | null>(null);

  const handleAddEvidence = (newEvidence: Omit<EvidenceItem, 'id' | 'timestamp'>) => {
    const item: EvidenceItem = {
      ...newEvidence,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    setEvidences([item, ...evidences]);
    setPdfError(null); 
  };

  const handleWizardSave = (items: EvidenceItem[]) => {
    if (wizardTrigger?.mode === 'edit') {
      const updatedItem = items[0]; 
      setEvidences(prevEvidences => 
        prevEvidences.map(ev => ev.id === updatedItem.id ? updatedItem : ev)
      );
    } else {
      setEvidences([...items, ...evidences]);
    }
    
    setWizardTrigger(null);
    setPdfError(null);
  };

  const handleDeleteEvidence = (id: string) => {
    setEvidences(evidences.filter(e => e.id !== id));
  };

  const handleAddCase = (originId: string) => {
    const origin = evidences.find(e => e.id === originId);
    if (!origin || !origin.testCaseDetails) return;

    const scenarioNum = origin.testCaseDetails.scenarioNumber;
    
    const existingCases = evidences.filter(e => e.testCaseDetails?.scenarioNumber === scenarioNum);
    const maxCaseNum = existingCases.reduce((max, curr) => {
      return Math.max(max, curr.testCaseDetails?.caseNumber || 0);
    }, 0);
    
    const nextCaseNum = maxCaseNum + 1;

    setWizardTrigger({
      mode: 'create',
      scenarioNumber: scenarioNum,
      nextCaseNumber: nextCaseNum,
      ticketInfo: origin.ticketInfo
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditCase = (id: string) => {
    const item = evidences.find(e => e.id === id);
    if (!item || !item.testCaseDetails) return;

    setWizardTrigger({
      mode: 'edit',
      scenarioNumber: item.testCaseDetails.scenarioNumber,
      nextCaseNumber: item.testCaseDetails.caseNumber,
      ticketInfo: item.ticketInfo,
      evidenceId: item.id,
      existingDetails: item.testCaseDetails
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    if (!editingHistoryId && evidences.length > 0) {
        if (!window.confirm('Tem certeza que deseja limpar todos os dados e cancelar este registro?')) {
            return;
        }
    }
    
    setEvidences([]);
    setWizardTrigger(null);
    setEditingTicketInfo(null);
    setEditingHistoryId(null);
    setPdfError(null);
    
    setFormKey(prev => prev + 1); 
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseAndGeneratePDF = () => {
    setPdfError(null);
    if (!reportRef.current || evidences.length === 0) return;

    const masterTicketInfo = formTicketInfoRef.current || evidences[0].ticketInfo;
    
    const requiredFields: { key: keyof TicketInfo; label: string }[] = [
       { key: 'requestDate', label: 'Data da Solicitação' },
       { key: 'ticketId', label: 'Chamado (ID)' },
       { key: 'sprint', label: 'Sprint' },
       { key: 'requester', label: 'Solicitante' },
       { key: 'analyst', label: 'Analista de Teste' },
       { key: 'ticketTitle', label: 'Título do Chamado' }
    ];

    const missingFields = requiredFields.filter(field => {
        const value = masterTicketInfo[field.key];
        return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
        const missingLabels = missingFields.map(f => f.label).join(', ');
        setPdfError(`Para fechar a evidência, preencha os campos obrigatórios: ${missingLabels}.`);
        return;
    }
    
    // Show confirmation modal instead of executing immediately
    setShowPdfModal(true);
  };

  const executePdfGeneration = () => {
    if (!reportRef.current) return;

    setShowPdfModal(false);
    setIsGeneratingPdf(true);
    
    const masterTicketInfo = formTicketInfoRef.current || evidences[0].ticketInfo;
    const ticketTitle = masterTicketInfo.ticketTitle;
    const safeFilename = ticketTitle.replace(/[/\\?%*:|"<>]/g, '-');

    const opt = {
      margin: [10, 10],
      filename: `${safeFilename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(reportRef.current).save().then(() => {
      const consistentEvidences = evidences.map(ev => ({
         ...ev,
         ticketInfo: masterTicketInfo
      }));

      if (editingHistoryId) {
         setTicketHistory(prev => prev.map(t => {
            if (t.id === editingHistoryId) {
                return {
                    ...t,
                    ticketInfo: masterTicketInfo,
                    items: consistentEvidences,
                    archivedAt: Date.now()
                };
            }
            return t;
         }));
      } else {
         const archivedTicket: ArchivedTicket = {
            id: crypto.randomUUID(),
            ticketInfo: masterTicketInfo,
            items: consistentEvidences,
            archivedAt: Date.now()
          };
          setTicketHistory(prev => [archivedTicket, ...prev]);
      }

      setEvidences([]);
      setWizardTrigger(null);
      setEditingTicketInfo(null);
      setEditingHistoryId(null);
      
      setFormKey(prev => prev + 1);

      setIsGeneratingPdf(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  };

  const handleOpenArchivedTicket = (ticket: ArchivedTicket) => {
    if (evidences.length > 0) {
      if (!confirm('Existe um chamado em andamento. Deseja substituí-lo pelos dados do histórico?')) {
        return;
      }
    }

    setEvidences(ticket.items);
    setEditingTicketInfo(ticket.ticketInfo);
    setEditingHistoryId(ticket.id);
    setWizardTrigger(null);
    setPdfError(null);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to get current ticket info for modal display
  const getCurrentTicketInfo = () => {
    if (evidences.length > 0) return evidences[0].ticketInfo;
    if (formTicketInfoRef.current) return formTicketInfoRef.current;
    return null;
  };
  
  const modalTicketInfo = getCurrentTicketInfo();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Main Content */}
        <div className="space-y-10 pb-8" ref={reportRef}>
          <EvidenceForm 
            key={formKey}
            onSubmit={handleAddEvidence} 
            onWizardSave={handleWizardSave}
            wizardTrigger={wizardTrigger}
            onClearTrigger={() => setWizardTrigger(null)}
            evidences={evidences}
            initialTicketInfo={editingTicketInfo}
            onTicketInfoChange={(info) => { formTicketInfoRef.current = info; }}
          />
          
          <div>
             {evidences.length > 0 && (
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                   <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                   Cenário de Teste do Chamado
                </h3>
             )}
            <EvidenceList 
              evidences={evidences} 
              onDelete={handleDeleteEvidence} 
              onAddCase={handleAddCase}
              onEditCase={handleEditCase}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 border-t border-slate-200 pt-8 flex flex-col items-center">
           {pdfError && (
             <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-5 py-3 rounded-xl flex items-start gap-3 animate-shake max-w-xl shadow-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                <span className="text-sm font-semibold">{pdfError}</span>
             </div>
           )}

           <div className="flex gap-4">
               {(evidences.length > 0 || editingTicketInfo) && (
                   <button
                      onClick={handleCancelEdit}
                      disabled={isGeneratingPdf}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-all"
                   >
                      <X className="w-5 h-5" />
                      <span>{editingHistoryId ? 'Cancelar Edição' : 'Limpar Tudo'}</span>
                   </button>
               )}

               <button
                  onClick={handleCloseAndGeneratePDF}
                  disabled={evidences.length === 0 || isGeneratingPdf}
                  className={`flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 ${
                     evidences.length === 0 || isGeneratingPdf
                     ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                     : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-200'
                  }`}
               >
                  {isGeneratingPdf ? (
                     <>
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       {editingHistoryId ? 'Atualizando...' : 'Gerando PDF...'}
                     </>
                  ) : (
                     <>
                       <FileCheck className="w-5 h-5" />
                       <span>{editingHistoryId ? 'Salvar Edição e Gerar PDF' : 'Fechar Evidência e Gerar PDF'}</span>
                     </>
                  )}
               </button>
           </div>
        </div>

        {/* HISTÓRICO */}
        {ticketHistory.length > 0 && (
          <div className="mt-20 pt-10 border-t-2 border-dashed border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
              <div className="bg-slate-200 p-2 rounded-lg">
                 <Archive className="w-6 h-6 text-slate-600" />
              </div>
              Histórico de Evidências
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ticketHistory.map((ticket) => (
                <div 
                  key={ticket.id} 
                  onClick={() => handleOpenArchivedTicket(ticket)}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer ring-0 hover:ring-2 hover:ring-indigo-100"
                >
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {ticket.ticketInfo.ticketId}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(ticket.archivedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2 mb-3 group-hover:text-indigo-600 transition-colors">
                      {ticket.ticketInfo.ticketTitle}
                    </h3>
                    
                    <p className="text-sm text-slate-500 mb-5 line-clamp-2 leading-relaxed">
                       {ticket.ticketInfo.ticketDescription || 'Sem descrição.'}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-4 border-t border-slate-50">
                      <span className="flex items-center gap-1"><FileCheck className="w-3 h-3" /> {ticket.items.length} evidências</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticket.ticketInfo.analyst}</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                    <button 
                       type="button"
                       className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-2 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" /> Abrir e Editar
                    </button>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      <Footer />

      {/* PDF FINALIZATION CONFIRMATION MODAL */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
            onClick={() => setShowPdfModal(false)}
          ></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-0 overflow-hidden transform transition-all scale-100 border border-slate-100">
             
             <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCheck className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                        <CheckCheck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold leading-tight">Finalizar Chamado</h3>
                        <p className="text-emerald-100 text-sm font-medium">Confirme os dados para geração do PDF</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowPdfModal(false)}
                    className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
             </div>

             <div className="p-8">
                 <div className="flex flex-col gap-6">
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Chamado & Título</span>
                                <p className="font-bold text-slate-800 text-lg leading-tight">
                                    <span className="text-indigo-600 mr-2">{modalTicketInfo?.ticketId}</span> 
                                    {modalTicketInfo?.ticketTitle}
                                </p>
                            </div>
                        </div>
                        <div className="w-full h-px bg-slate-200/50"></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Evidências</span>
                                <p className="font-medium text-slate-700">{evidences.length} registros</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Analista</span>
                                <p className="font-medium text-slate-700">{modalTicketInfo?.analyst}</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 text-center px-4">
                        Ao confirmar, o documento PDF será gerado automaticamente e o registro será salvo no histórico local.
                    </p>

                    <div className="flex gap-3 mt-2">
                        <button 
                        onClick={() => setShowPdfModal(false)}
                        className="flex-1 px-4 py-3.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        >
                        Voltar e Editar
                        </button>
                        <button 
                        onClick={executePdfGeneration}
                        className="flex-1 px-4 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                        >
                        <CheckCheck className="w-5 h-5" />
                        Gerar Documento
                        </button>
                    </div>
                 </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;