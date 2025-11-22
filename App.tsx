
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EvidenceForm from './components/EvidenceForm';
import EvidenceList from './components/EvidenceList';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import EvidenceManagement from './components/EvidenceManagement';
import { EvidenceItem, TicketInfo, TestCaseDetails, ArchivedTicket, TestStatus, User } from './types';
import { STATUS_CONFIG } from './constants';
import { FileCheck, AlertTriangle, Archive, Calendar, User as UserIcon, Layers, ListChecks, CheckCircle2, XCircle, AlertCircle, ShieldCheck, CheckCheck, FileText, X, Save, FileDown, Loader2, Clock } from 'lucide-react';

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
  // --- AUTHENTICATION & USER STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'evidences'>('users');

  // --- DATA STATE ---
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [ticketHistory, setTicketHistory] = useState<ArchivedTicket[]>([]);
  
  const [formKey, setFormKey] = useState(0);
  const [editingTicketInfo, setEditingTicketInfo] = useState<TicketInfo | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<'PDF' | 'SAVE'>('PDF');
  
  // State for History PDF generation
  const [printingHistoryId, setPrintingHistoryId] = useState<string | null>(null);
  const historyPrintRef = useRef<HTMLDivElement>(null);
  
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [wizardTrigger, setWizardTrigger] = useState<WizardTriggerContext | null>(null);
  
  const formTicketInfoRef = useRef<TicketInfo | null>(null);

  // --- PERSISTENCE & INITIALIZATION ---
  useEffect(() => {
    // Load Users
    const storedUsers = localStorage.getItem('narnia_users');
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      // Seed default admins requested
      const defaultAdmins: User[] = [
        { id: 'admin-vtp', acronym: 'VTP', name: 'Valeria', password: 'VTP', role: 'ADMIN', isActive: true },
        { id: 'admin-gaf', acronym: 'GAF', name: 'Guilherme', password: 'GAF', role: 'ADMIN', isActive: true },
        { id: 'admin-kps', acronym: 'KPS', name: 'Karina', password: 'KPS', role: 'ADMIN', isActive: true },
        { id: 'admin-rfp', acronym: 'RFP', name: 'Renan', password: 'RFP', role: 'ADMIN', isActive: true },
        { id: 'admin-eds', acronym: 'EDS', name: 'Everton', password: 'EDS', role: 'ADMIN', isActive: true },
        { id: 'admin-yeb', acronym: 'YEB', name: 'Ygor', password: 'YEB', role: 'ADMIN', isActive: true }
      ];
      setUsers(defaultAdmins);
      localStorage.setItem('narnia_users', JSON.stringify(defaultAdmins));
    }

    // Load Tickets
    const storedTickets = localStorage.getItem('narnia_tickets');
    if (storedTickets) {
      setTicketHistory(JSON.parse(storedTickets));
    }
  }, []);

  // Save Users when changed
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('narnia_users', JSON.stringify(users));
    }
  }, [users]);

  // Save Tickets when changed
  useEffect(() => {
    if (ticketHistory.length > 0 || (ticketHistory.length === 0 && localStorage.getItem('narnia_tickets'))) {
      localStorage.setItem('narnia_tickets', JSON.stringify(ticketHistory));
    }
  }, [ticketHistory]);


  // --- AUTH HANDLERS ---
  const handleLogin = (acronym: string, pass: string) => {
    const user = users.find(u => 
      u.acronym.toLowerCase() === acronym.trim().toLowerCase() && 
      u.password.toLowerCase() === pass.trim().toLowerCase()
    );

    if (user) {
      if (user.isActive === false) {
        setLoginError('Acesso negado. Usuário desativado.');
        return;
      }
      setCurrentUser(user);
      setLoginError(null);
      // Reset form info to current user defaults
      setEditingTicketInfo({
         ...editingTicketInfo!,
         analyst: user.acronym // Use Acronym instead of Name
      });
    } else {
      setLoginError('Credenciais inválidas. Verifique sigla e senha.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEvidences([]); // Clear current workspace
    setEditingTicketInfo(null);
    setEditingHistoryId(null);
    setShowAdminPanel(false);
    setAdminTab('users');
  };

  const handleAddUser = (user: User) => {
    setUsers([...users, user]);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
       setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    // Update current session if user updated themselves
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };


  // --- EVIDENCE HANDLERS ---

  const handleAddEvidence = (newEvidence: Omit<EvidenceItem, 'id' | 'timestamp' | 'createdBy'>) => {
    if (!currentUser) return;

    const item: EvidenceItem = {
      ...newEvidence,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      createdBy: currentUser.acronym,
      ticketInfo: {
        ...newEvidence.ticketInfo,
        analyst: currentUser.acronym // Use Acronym instead of Name
      }
    };
    setEvidences([item, ...evidences]);
    setPdfError(null); 
  };

  const handleWizardSave = (items: Omit<EvidenceItem, 'createdBy'>[]) => {
    if (!currentUser) return;

    const itemsWithUser = items.map(item => ({
        ...item,
        createdBy: currentUser.acronym,
        ticketInfo: {
            ...item.ticketInfo,
            analyst: currentUser.acronym // Use Acronym instead of Name
        }
    }));

    if (wizardTrigger?.mode === 'edit') {
      const updatedItem = itemsWithUser[0]; 
      setEvidences(prevEvidences => 
        prevEvidences.map(ev => ev.id === updatedItem.id ? updatedItem : ev)
      );
    } else {
      setEvidences([...itemsWithUser, ...evidences]);
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

  // --- VALIDATION & SAVING LOGIC ---

  const validateTicketRequirements = (): boolean => {
    setPdfError(null);
    if (evidences.length === 0) return false;

    const masterTicketInfo = formTicketInfoRef.current || evidences[0].ticketInfo;
    
    const requiredFields: { key: keyof TicketInfo; label: string }[] = [
       { key: 'requestDate', label: 'Data da Solicitação' },
       { key: 'ticketId', label: 'Chamado (ID)' },
       { key: 'sprint', label: 'Sprint' },
       { key: 'requester', label: 'Solicitante' },
       { key: 'ticketTitle', label: 'Título do Chamado' }
    ];

    const missingFields = requiredFields.filter(field => {
        const value = masterTicketInfo[field.key];
        return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
        const missingLabels = missingFields.map(f => f.label).join(', ');
        setPdfError(`Para finalizar, preencha os campos obrigatórios: ${missingLabels}.`);
        return false;
    }
    
    return true;
  };

  const persistCurrentTicket = () => {
      if (!currentUser) return;
      const masterTicketInfo = formTicketInfoRef.current || evidences[0].ticketInfo;
      const consistentEvidences = evidences.map(ev => ({
         ...ev,
         ticketInfo: masterTicketInfo,
         createdBy: currentUser.acronym
      }));

      if (editingHistoryId) {
         setTicketHistory(prev => prev.map(t => {
            if (t.id === editingHistoryId) {
                return {
                    ...t,
                    ticketInfo: masterTicketInfo,
                    items: consistentEvidences,
                    archivedAt: Date.now(),
                    createdBy: currentUser.acronym
                };
            }
            return t;
         }));
      } else {
         const archivedTicket: ArchivedTicket = {
            id: crypto.randomUUID(),
            ticketInfo: masterTicketInfo,
            items: consistentEvidences,
            archivedAt: Date.now(),
            createdBy: currentUser.acronym
          };
          setTicketHistory(prev => [archivedTicket, ...prev]);
      }

      // Clear Workspace
      setEvidences([]);
      setWizardTrigger(null);
      setEditingTicketInfo(null);
      setEditingHistoryId(null);
      setFormKey(prev => prev + 1);
  };

  // Button 1: Save & Close (Histórico) - Uses same modal flow as PDF
  const handleSaveAndClose = () => {
    if (!validateTicketRequirements()) return;
    setConfirmationMode('SAVE');
    setShowPdfModal(true);
  };

  // Button 2: Generate PDF (and Save)
  const handlePdfFlow = () => {
    if (!validateTicketRequirements()) return;
    setConfirmationMode('PDF');
    setShowPdfModal(true);
  };

  const handleModalConfirm = () => {
    if (confirmationMode === 'PDF') {
        executePdfGeneration();
    } else {
        // Save Mode
        persistCurrentTicket();
        setShowPdfModal(false);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const executePdfGeneration = () => {
    if (!reportRef.current || !currentUser) return;

    // We don't close modal yet if it's PDF mode to show spinner inside button if we wanted, 
    // but here we close it to show loading state on the button outside or keep modal?
    // The previous logic closed modal then showed loading on the button. 
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
      persistCurrentTicket();
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
    setShowAdminPanel(false); // Close admin panel if opening a ticket

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handler for downloading PDF from History Card
  const handleDownloadHistoryPdf = (e: React.MouseEvent, ticket: ArchivedTicket) => {
    e.stopPropagation();
    setPrintingHistoryId(ticket.id);
    
    // Slight delay to allow render
    setTimeout(() => {
      if (historyPrintRef.current) {
        const safeFilename = ticket.ticketInfo.ticketTitle.replace(/[/\\?%*:|"<>]/g, '-');
        const opt = {
          margin: [10, 10],
          filename: `${safeFilename}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(historyPrintRef.current).save().then(() => {
          setPrintingHistoryId(null);
        });
      }
    }, 800);
  };

  const getTicketAggregateStatus = (items: EvidenceItem[]) => {
    const hasFailure = items.some(i => i.status === TestStatus.FAIL);
    const hasBlocker = items.some(i => i.status === TestStatus.BLOCKED);
    const hasPending = items.some(i => i.status === TestStatus.PENDING || i.status === TestStatus.SKIPPED);
    
    if (hasFailure) return STATUS_CONFIG[TestStatus.FAIL];
    if (hasBlocker) return STATUS_CONFIG[TestStatus.BLOCKED];
    if (hasPending) return STATUS_CONFIG[TestStatus.SKIPPED]; // Use SKIPPED config which maps to Pendente/Clock
    return STATUS_CONFIG[TestStatus.PASS];
  };

  const getCurrentTicketInfo = () => {
    if (evidences.length > 0) return evidences[0].ticketInfo;
    if (formTicketInfoRef.current) return formTicketInfoRef.current;
    return null;
  };
  
  const modalTicketInfo = getCurrentTicketInfo();

  // Ticket to be printed from history
  const ticketToPrint = useMemo(() => {
    return ticketHistory.find(t => t.id === printingHistoryId);
  }, [ticketHistory, printingHistoryId]);

  // --- FILTERING FOR UI ---
  // Admin sees ALL tickets. User sees ONLY their tickets.
  const displayedHistory = currentUser?.role === 'ADMIN' 
      ? ticketHistory 
      : ticketHistory.filter(t => t.createdBy === currentUser?.acronym);

  // --- RENDER ---

  if (!currentUser) {
     return <Login onLogin={handleLogin} error={loginError} />;
  }
  
  const isPdfMode = confirmationMode === 'PDF';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header user={currentUser} onLogout={handleLogout} />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* User Management Panel Toggle */}
        {currentUser && (
            <div className="mb-8 flex justify-end">
                <button 
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className={`flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm border ${
                        showAdminPanel 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    {showAdminPanel ? 'Fechar Painel' : (currentUser.role === 'ADMIN' ? 'Painel Administrativo' : 'Meu Perfil')}
                </button>
            </div>
        )}

        {showAdminPanel ? (
            <div className="animate-fade-in space-y-8">
                {/* ADMIN TABS */}
                {currentUser.role === 'ADMIN' && (
                    <div className="flex justify-center">
                        <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            <button 
                              onClick={() => setAdminTab('users')}
                              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                  adminTab === 'users' 
                                  ? 'bg-slate-900 text-white shadow-md' 
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                                <UserIcon className="w-4 h-4" />
                                Usuários
                            </button>
                            <button 
                              onClick={() => setAdminTab('evidences')}
                              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                  adminTab === 'evidences' 
                                  ? 'bg-slate-900 text-white shadow-md' 
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                                <Layers className="w-4 h-4" />
                                Gestão de Evidências
                            </button>
                        </div>
                    </div>
                )}

                {/* CONTENT */}
                {adminTab === 'users' || currentUser.role !== 'ADMIN' ? (
                    <UserManagement 
                        users={users} 
                        onAddUser={handleAddUser} 
                        onDeleteUser={handleDeleteUser}
                        onUpdateUser={handleUpdateUser}
                        currentUserId={currentUser.id}
                    />
                ) : (
                    <EvidenceManagement tickets={ticketHistory} users={users} />
                )}
            </div>
        ) : (
            <>
                {/* Main Evidence Form Content */}
                <div className="space-y-10 pb-8" ref={reportRef}>
                <EvidenceForm 
                    key={formKey}
                    onSubmit={handleAddEvidence} 
                    onWizardSave={handleWizardSave}
                    wizardTrigger={wizardTrigger}
                    onClearTrigger={() => setWizardTrigger(null)}
                    evidences={evidences}
                    initialTicketInfo={editingTicketInfo || (currentUser ? { analyst: currentUser.acronym } as TicketInfo : null)} // Use Acronym instead of Name
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
                    {editingHistoryId && (
                        <button
                            onClick={handleCancelEdit}
                            disabled={isGeneratingPdf}
                            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-all"
                        >
                            <X className="w-5 h-5" />
                            <span>Cancelar Edição</span>
                        </button>
                    )}

                    {/* Botão Salvar Evidência */}
                    <button
                        onClick={handleSaveAndClose}
                        disabled={evidences.length === 0 || isGeneratingPdf}
                        className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-300 shadow-sm hover:bg-slate-50 hover:text-indigo-700 hover:border-indigo-300 transition-all ${
                            evidences.length === 0 || isGeneratingPdf ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                         <Save className="w-5 h-5" />
                         <span>Salvar Evidência</span>
                    </button>

                    {/* Botão Gerar PDF (Salvar com PDF) */}
                    <button
                        onClick={handlePdfFlow}
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
                            <FileDown className="w-5 h-5" />
                            <span>Gerar PDF</span>
                            </>
                        )}
                    </button>
                </div>
                </div>

                {/* HISTÓRICO */}
                {displayedHistory.length > 0 && (
                <div className="mt-20 pt-10 border-t-2 border-dashed border-slate-200">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="bg-slate-200 p-2 rounded-lg">
                                <Archive className="w-6 h-6 text-slate-600" />
                            </div>
                            Histórico de Evidências {currentUser.role === 'ADMIN' ? '(Geral)' : '(Meus)'}
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedHistory.map((ticket) => {
                        const statusConfig = getTicketAggregateStatus(ticket.items);
                        const StatusIcon = statusConfig.icon;
                        const uniqueScenarios = new Set(ticket.items.map(i => i.testCaseDetails?.scenarioNumber)).size;
                        const displayDate = ticket.ticketInfo.evidenceDate 
                            ? ticket.ticketInfo.evidenceDate.split('-').reverse().join('/') 
                            : new Date(ticket.archivedAt).toLocaleDateString('pt-BR');

                        return (
                        <div 
                            key={ticket.id} 
                            onClick={() => handleOpenArchivedTicket(ticket)}
                            className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer ring-0 hover:ring-2 hover:ring-indigo-100 relative"
                        >
                            <div className="p-5 flex-1">
                            {/* Header: Status & Date */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data da Evidência</span>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 w-fit">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        {displayDate}
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.color}`}>
                                    <StatusIcon className="w-3 h-3 mr-1.5" />
                                    {statusConfig.label}
                                </span>
                            </div>
                            
                            {/* Ticket Info */}
                            <div className="mb-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        {ticket.ticketInfo.ticketId}
                                    </span>
                                    {currentUser.role === 'ADMIN' && ticket.createdBy && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                            <UserIcon className="w-3 h-3 mr-1" /> {ticket.createdBy}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors" title={ticket.ticketInfo.ticketTitle}>
                                    {ticket.ticketInfo.ticketTitle}
                                </h3>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Layers className="w-4 h-4 text-slate-400 mb-1" />
                                    <span className="text-lg font-bold text-slate-700">{uniqueScenarios}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Cenários</span>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <ListChecks className="w-4 h-4 text-slate-400 mb-1" />
                                    <span className="text-lg font-bold text-slate-700">{ticket.items.length}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Casos</span>
                                </div>
                            </div>

                            {/* Footer: Analyst & Download */}
                            <div className="flex items-center justify-between py-3 border-t border-dashed border-slate-200 mt-auto">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 border border-white shadow-sm">
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Analista</span>
                                        <span className="text-xs font-semibold text-slate-700">{ticket.ticketInfo.analyst || 'N/A'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleDownloadHistoryPdf(e, ticket)}
                                    disabled={!!printingHistoryId}
                                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors border border-indigo-100"
                                    title="Baixar PDF do Histórico"
                                >
                                    {printingHistoryId === ticket.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileDown className="w-4 h-4" />
                                    )}
                                    Download PDF
                                </button>
                            </div>
                            </div>
                            
                            {/* Hover Effect Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                        </div>
                        );
                    })}
                    </div>
                </div>
                )}
            </>
        )}

      </main>
      <Footer />

      {/* CONFIRMATION MODAL (SHARED FOR PDF & SAVE) */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
            onClick={() => setShowPdfModal(false)}
          ></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-0 overflow-hidden transform transition-all scale-100 border border-slate-100">
             
             <div className={`bg-gradient-to-br p-6 text-white relative overflow-hidden ${isPdfMode ? 'from-emerald-500 to-teal-600' : 'from-indigo-600 to-blue-700'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    {isPdfMode ? (
                        <CheckCheck className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
                    ) : (
                        <Save className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
                    )}
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                        {isPdfMode ? <CheckCheck className="w-8 h-8 text-white" /> : <Save className="w-8 h-8 text-white" />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold leading-tight">{isPdfMode ? 'Finalizar Chamado' : 'Salvar Evidência'}</h3>
                        <p className={`${isPdfMode ? 'text-emerald-100' : 'text-indigo-100'} text-sm font-medium`}>
                            {isPdfMode ? 'Confirme os dados para geração do PDF' : 'Confirme os dados para salvar no histórico'}
                        </p>
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
                        {isPdfMode 
                            ? 'Ao confirmar, o documento PDF será gerado automaticamente e o registro será salvo no histórico local.' 
                            : 'Ao confirmar, o registro será salvo no histórico local e o formulário será limpo.'}
                    </p>

                    <div className="flex gap-3 mt-2">
                        <button 
                        onClick={() => setShowPdfModal(false)}
                        className="flex-1 px-4 py-3.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        >
                        Voltar e Editar
                        </button>
                        <button 
                        onClick={handleModalConfirm}
                        className={`flex-1 px-4 py-3.5 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                            isPdfMode 
                            ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200' 
                            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
                        }`}
                        >
                        {isPdfMode ? <CheckCheck className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                        {isPdfMode ? 'Gerar Documento' : 'Confirmar e Salvar'}
                        </button>
                    </div>
                 </div>
             </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container for History */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1200px' }}>
         <div ref={historyPrintRef} className="bg-white p-8 min-h-screen">
            {ticketToPrint && (
                <div className="space-y-8">
                    <EvidenceForm 
                        onSubmit={() => {}} 
                        onWizardSave={() => {}}
                        initialTicketInfo={ticketToPrint.ticketInfo}
                    />
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                            Cenário de Teste do Chamado
                        </h3>
                        <EvidenceList 
                            evidences={ticketToPrint.items} 
                            onDelete={() => {}}
                        />
                    </div>
                </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default App;
