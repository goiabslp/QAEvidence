
import React, { useState, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EvidenceForm from './components/EvidenceForm';
import EvidenceList from './components/EvidenceList';
import { EvidenceItem, TicketInfo, TestCaseDetails, ArchivedTicket } from './types';
import { FileCheck, AlertTriangle, Archive, RefreshCw, Calendar, Edit3, ArrowRight, X } from 'lucide-react';

declare const html2pdf: any;

// Tipo para o gatilho do Wizard
export interface WizardTriggerContext {
  mode: 'create' | 'edit';
  scenarioNumber: number;
  nextCaseNumber: number;
  ticketInfo: TicketInfo;
  evidenceId?: string; // ID da evidência original (apenas para edição)
  existingDetails?: TestCaseDetails; // Detalhes para preencher o form (apenas edição)
}

const App: React.FC = () => {
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [ticketHistory, setTicketHistory] = useState<ArchivedTicket[]>([]);
  
  // Estado para forçar reset do form (key changing technique)
  const [formKey, setFormKey] = useState(0);
  // Estado para passar dados ao form quando editando um histórico
  const [editingTicketInfo, setEditingTicketInfo] = useState<TicketInfo | null>(null);
  // Rastreia o ID do item de histórico que está sendo editado
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Estado para controlar a abertura do Wizard via lista
  const [wizardTrigger, setWizardTrigger] = useState<WizardTriggerContext | null>(null);
  
  // Ref para manter os dados atuais do formulário sem causar re-render
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
      // Modo Edição: Atualiza o item existente
      const updatedItem = items[0]; 
      setEvidences(prevEvidences => 
        prevEvidences.map(ev => ev.id === updatedItem.id ? updatedItem : ev)
      );
    } else {
      // Modo Criação: Adiciona novos itens
      setEvidences([...items, ...evidences]);
    }
    
    // Limpa o trigger após salvar
    setWizardTrigger(null);
    setPdfError(null);
  };

  const handleDeleteEvidence = (id: string) => {
    setEvidences(evidences.filter(e => e.id !== id));
  };

  // Prepara o contexto para abrir o Wizard em modo de criação (adicionar caso ao cenário)
  const handleAddCase = (originId: string) => {
    const origin = evidences.find(e => e.id === originId);
    if (!origin || !origin.testCaseDetails) return;

    const scenarioNum = origin.testCaseDetails.scenarioNumber;
    
    // Encontra o maior número de caso existente para este cenário
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

  // Prepara o contexto para abrir o Wizard em modo de EDIÇÃO
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

  // Função para Cancelar a Edição / Limpar Tela
  const handleCancelEdit = () => {
    if (evidences.length > 0 || editingHistoryId) {
        const confirmMessage = editingHistoryId 
            ? 'Deseja cancelar a edição? As alterações não salvas serão perdidas.'
            : 'Tem certeza que deseja limpar todos os dados e cancelar este registro?';
            
        if (!confirm(confirmMessage)) return;
    }
    
    // Limpa tudo para voltar à tela inicial limpa
    setEvidences([]);
    setWizardTrigger(null);
    setEditingTicketInfo(null);
    setEditingHistoryId(null);
    setPdfError(null);
    
    // Incrementa a key para forçar a remontagem completa do formulário (reset visual)
    setFormKey(prev => prev + 1); 
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseAndGeneratePDF = () => {
    setPdfError(null);
    if (!reportRef.current || evidences.length === 0) return;

    // --- VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS ---
    // Usa o ref do formulário se disponível, senão pega do primeiro item
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
    // -----------------------------------------
    
    setIsGeneratingPdf(true);

    // Use ticket title for filename
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
      // APÓS GERAR O PDF:
      
      // Atualiza as evidências com o TicketInfo mais recente (do form) para garantir consistência
      const consistentEvidences = evidences.map(ev => ({
         ...ev,
         ticketInfo: masterTicketInfo
      }));

      if (editingHistoryId) {
         // ATUALIZAR HISTÓRICO EXISTENTE (Não duplica)
         setTicketHistory(prev => prev.map(t => {
            if (t.id === editingHistoryId) {
                return {
                    ...t,
                    ticketInfo: masterTicketInfo,
                    items: consistentEvidences,
                    archivedAt: Date.now() // Atualiza timestamp
                };
            }
            return t;
         }));
      } else {
         // CRIAR NOVO HISTÓRICO
         const archivedTicket: ArchivedTicket = {
            id: crypto.randomUUID(),
            ticketInfo: masterTicketInfo,
            items: consistentEvidences,
            archivedAt: Date.now()
          };
          setTicketHistory(prev => [archivedTicket, ...prev]);
      }

      // 3. Resetar Estado Atual (Limpar Tela)
      setEvidences([]);
      setWizardTrigger(null);
      setEditingTicketInfo(null);
      setEditingHistoryId(null);
      
      // 4. Forçar remontagem do Form para limpar campos
      setFormKey(prev => prev + 1);

      setIsGeneratingPdf(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  };

  const handleOpenArchivedTicket = (ticket: ArchivedTicket) => {
    // 1. Confirmação simples se houver trabalho não salvo
    if (evidences.length > 0) {
      if (!confirm('Existe um chamado em andamento. Deseja substituí-lo pelos dados do histórico?')) {
        return;
      }
    }

    // 2. Carregar evidências
    setEvidences(ticket.items);

    // 3. Carregar info do chamado no Form
    setEditingTicketInfo(ticket.ticketInfo);
    setEditingHistoryId(ticket.id); // Marca que estamos editando este ID

    // 4. Resetar trigger do wizard
    setWizardTrigger(null);
    setPdfError(null);

    // 5. Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Main Content: Form and List */}
        <div className="space-y-8 pb-8" ref={reportRef}>
          <EvidenceForm 
            key={formKey} // Key change forces component remount (clean reset)
            onSubmit={handleAddEvidence} 
            onWizardSave={handleWizardSave}
            wizardTrigger={wizardTrigger}
            onClearTrigger={() => setWizardTrigger(null)}
            evidences={evidences}
            initialTicketInfo={editingTicketInfo}
            onTicketInfoChange={(info) => { formTicketInfoRef.current = info; }}
          />
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-blue-600 pl-3">
              Cenário de Teste do Chamado
            </h3>
            <EvidenceList 
              evidences={evidences} 
              onDelete={handleDeleteEvidence} 
              onAddCase={handleAddCase}
              onEditCase={handleEditCase}
            />
          </div>
        </div>

        {/* Action Button at the bottom of the content */}
        <div className="mt-12 border-t border-gray-200 pt-6 flex flex-col items-end">
           {/* Validation Error Message */}
           {pdfError && (
             <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 animate-shake max-w-xl">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{pdfError}</span>
             </div>
           )}

           <div className="flex gap-3">
               {/* Botão Cancelar / Limpar */}
               {(evidences.length > 0 || editingTicketInfo) && (
                   <button
                      onClick={handleCancelEdit}
                      disabled={isGeneratingPdf}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-gray-600 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all"
                   >
                      <X className="w-5 h-5" />
                      <span>{editingHistoryId ? 'Cancelar Edição' : 'Limpar Tudo'}</span>
                   </button>
               )}

               {/* Botão Gerar PDF */}
               <button
                  onClick={handleCloseAndGeneratePDF}
                  disabled={evidences.length === 0 || isGeneratingPdf}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-md transition-all transform hover:-translate-y-1 ${
                     evidences.length === 0 || isGeneratingPdf
                     ? 'bg-gray-400 cursor-not-allowed' 
                     : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
                  }`}
               >
                  {isGeneratingPdf ? (
                     <>
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       {editingHistoryId ? 'Atualizando e Finalizando...' : 'Gerando PDF e Finalizando...'}
                     </>
                  ) : (
                     <>
                       <FileCheck className="w-5 h-5" />
                       <span>{editingHistoryId ? 'Salvar Edição e Gerar PDF' : 'Fechar Evidência do Chamado e Gerar PDF'}</span>
                     </>
                  )}
               </button>
           </div>
        </div>

        {/* HISTÓRICO DE EVIDÊNCIAS */}
        {ticketHistory.length > 0 && (
          <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Archive className="w-6 h-6 text-gray-500" />
              Histórico de Evidências
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ticketHistory.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300 flex flex-col overflow-hidden group">
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ticket.ticketInfo.ticketId}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ticket.archivedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                      {ticket.ticketInfo.ticketTitle}
                    </h3>
                    
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                       {ticket.ticketInfo.ticketDescription || 'Sem descrição.'}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{ticket.items.length} evidências</span>
                      <span>•</span>
                      <span>{ticket.ticketInfo.analyst}</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                    <button 
                       onClick={() => handleOpenArchivedTicket(ticket)}
                       className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" /> Abrir e Editar
                    </button>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default App;
