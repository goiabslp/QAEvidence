
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EvidenceForm from './components/EvidenceForm';
import EvidenceList from './components/EvidenceList';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import EvidenceManagement from './components/EvidenceManagement';
import DashboardMetrics from './components/DashboardMetrics';
import { EvidenceItem, TicketInfo, TestCaseDetails, ArchivedTicket, TestStatus, User } from './types';
import { STATUS_CONFIG } from './constants';
import { FileCheck, AlertTriangle, Archive, Calendar, User as UserIcon, Layers, ListChecks, CheckCircle2, XCircle, AlertCircle, ShieldCheck, CheckCheck, FileText, X, Save, FileDown, Loader2, Clock, LayoutDashboard, Hash, ArrowRight, Download } from 'lucide-react';

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
  const [adminTab, setAdminTab] = useState<'users' | 'evidences' | 'dashboard'>('users');

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

  // Helper to extract ALL unique statuses present in a ticket
  const getTicketStatusBadges = (items: EvidenceItem[]) => {
      const statuses = new Set<TestStatus>();
      items.forEach(i => {
          if (i.status === TestStatus.SKIPPED) statuses.add(TestStatus.PENDING); // Normalize skipped to pending visually
          else statuses.add(i.status);
      });
      
      // Sort logic: Fail > Blocked > Pass > Pending
      const sortedStatuses = Array.from(statuses).sort((a, b) => {
          const order = { [TestStatus.FAIL]: 0, [TestStatus.BLOCKED]: 1, [TestStatus.PASS]: 2, [TestStatus.PENDING]: 3, [TestStatus.SKIPPED]: 3 };
          return (order[a] || 99) - (order[b] || 99);
      });

      return sortedStatuses.map(status => STATUS_CONFIG[status]);
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
                {/* TABS FOR ADMIN & USER */}
                <div className="flex justify-center">
                    <div className="flex flex-wrap gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        <button 
                          onClick={() => setAdminTab('users')}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                              adminTab === 'users' 
                              ? 'bg-slate-900 text-white shadow-md' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                            <UserIcon className="w-4 h-4" />
                            {currentUser.role === 'ADMIN' ? 'Usuários' : 'Meu Perfil'}
                        </button>
                        
                        {currentUser.role === 'ADMIN' && (
                          <button 
                            onClick={() => setAdminTab('evidences')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                adminTab === 'evidences' 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                              <Layers className="w-4 h-4" />
                              Evidências
                          </button>
                        )}
                        
                        <button 
                          onClick={() => setAdminTab('dashboard')}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                              adminTab === 'dashboard' 
                              ? 'bg-slate-900 text-white shadow-md' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                {adminTab === 'users' ? (
                    <UserManagement 
                        users={users} 
                        onAddUser={handleAddUser} 
                        onDeleteUser={handleDeleteUser}
                        onUpdateUser={handleUpdateUser}
                        currentUserId={currentUser.id}
                    />
                ) : adminTab === 'evidences' && currentUser.role === 'ADMIN' ? (
                     <EvidenceManagement tickets={ticketHistory} users={users} />
                ) : adminTab === 'dashboard' ? (
                     <DashboardMetrics tickets={ticketHistory} users={users} currentUser={currentUser} />
                ) : (
                     <UserManagement 
                        users={users} 
                        onAddUser={handleAddUser} 
                        onDeleteUser={handleDeleteUser}
                        onUpdateUser={handleUpdateUser}
                        currentUserId={currentUser.id}
                    />
                )}
            </div>
        ) : (
            // Main workspace when admin panel is NOT shown
            <>
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
                
                {/* List Header Actions (PDF/Save) */}
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <ListChecks className="w-5 h-5 text-indigo-600" />
                            Evidências Registradas
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                {evidences.length}
                            </span>
                        </h3>
                        {editingHistoryId && (
                           <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                                  <Archive className="w-3 h-3" /> Editando Histórico
                               </span>
                               <button onClick={handleCancelEdit} className="text-xs underline text-slate-400 hover:text-red-500">Cancelar</button>
                           </div>
                        )}
                    </div>
                    
                    <div className="flex gap-3">
                        {/* Save to History Button */}
                        <button 
                            onClick={handleSaveAndClose}
                            disabled={evidences.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">Salvar no Histórico</span>
                        </button>

                        {/* PDF Button */}
                        <button 
                           onClick={handlePdfFlow}
                           disabled={evidences.length === 0 || isGeneratingPdf}
                           className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                           {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                           Gerar PDF
                        </button>
                    </div>
                </div>

                {pdfError && (
                    <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 animate-pulse">
                        <AlertCircle className="w-4 h-4" />
                        {pdfError}
                    </div>
                )}

                <EvidenceList 
                    evidences={evidences}
                    onDelete={handleDeleteEvidence}
                    onAddCase={handleAddCase}
                    onEditCase={handleEditCase}
                />
             </>
        )}

        {!showAdminPanel && displayedHistory.length > 0 && (
             <div className="mt-16 pt-10 border-t border-slate-200 animate-fade-in">
                 <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <Archive className="w-6 h-6 text-indigo-600" />
                    </div>
                    Histórico de Chamados
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {displayedHistory.slice(0, 6).map(ticket => {
                         const statusBadges = getTicketStatusBadges(ticket.items);
                         const uniqueCaseIds = [...new Set(ticket.items.map(i => i.testCaseDetails?.caseId).filter(Boolean))];
                         
                         return (
                            <div 
                                key={ticket.id} 
                                onClick={() => handleOpenArchivedTicket(ticket)}
                                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col h-full"
                            >
                                {/* Header Color Line */}
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="p-6 flex-1 flex flex-col">
                                    {/* Ticket ID & Analyst */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chamado</span>
                                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 font-mono inline-block">
                                                {ticket.ticketInfo.ticketId}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Analista</span>
                                             <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600">
                                                 <UserIcon className="w-3 h-3" />
                                                 {ticket.ticketInfo.analyst || ticket.createdBy}
                                             </div>
                                        </div>
                                    </div>
                                    
                                    {/* Title */}
                                    <h4 className="text-lg font-bold text-slate-800 mb-3 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                        {ticket.ticketInfo.ticketTitle}
                                    </h4>

                                    {/* Status Tags (Accumulated) */}
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {statusBadges.map((conf, idx) => {
                                            const Icon = conf.icon;
                                            return (
                                                <span key={idx} className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm ${conf.color}`}>
                                                    <Icon className="w-3 h-3 mr-1" />
                                                    {conf.label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Metadata Footer */}
                                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {ticket.ticketInfo.evidenceDate ? ticket.ticketInfo.evidenceDate.split('-').reverse().join('/') : new Date(ticket.archivedAt).toLocaleDateString('pt-BR')}
                                            </span>
                                            
                                            <button
                                                onClick={(e) => handleDownloadHistoryPdf(e, ticket)}
                                                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors font-bold"
                                                title="Baixar PDF"
                                            >
                                                {printingHistoryId === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                                PDF
                                            </button>
                                        </div>

                                        {/* Case IDs (Truncated) */}
                                        {uniqueCaseIds.length > 0 && (
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <Hash className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                                                <div className="flex gap-1 overflow-hidden whitespace-nowrap mask-linear-fade">
                                                    {uniqueCaseIds.slice(0, 3).map((id, idx) => (
                                                        <span key={idx} className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-100 px-1.5 rounded">
                                                            {id}
                                                        </span>
                                                    ))}
                                                    {uniqueCaseIds.length > 3 && (
                                                        <span className="text-[10px] text-slate-400 font-bold">+{uniqueCaseIds.length - 3}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                         );
                     })}
                 </div>
             </div>
        )}

      </main>
      
      <Footer />

      {/* PDF Confirmation Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div 
             className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
             onClick={() => setShowPdfModal(false)}
          ></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform scale-100 transition-all">
             <div className="text-center">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${isPdfMode ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                   {isPdfMode ? <FileDown className="h-6 w-6 text-indigo-600" /> : <Save className="h-6 w-6 text-emerald-600" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                    {isPdfMode ? 'Gerar Relatório PDF' : 'Salvar no Histórico'}
                </h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">
                    {isPdfMode 
                     ? 'Deseja finalizar o chamado e gerar o arquivo PDF com todas as evidências?' 
                     : 'Deseja salvar este chamado no histórico e limpar a área de trabalho?'}
                </p>
                <div className="flex gap-3">
                    <button
                      onClick={() => setShowPdfModal(false)}
                      className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleModalConfirm}
                      className={`flex-1 px-4 py-2 rounded-xl text-white font-bold text-sm shadow-lg ${isPdfMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                      Confirmar
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Hidden Report Container for Main PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1200px' }}>
         <div ref={reportRef} className="bg-white p-10 min-h-screen">
            <div className="flex justify-between items-center mb-8 border-b-2 border-slate-800 pb-4">
                <h1 className="text-2xl font-bold text-slate-900">Relatório de Evidência de Teste</h1>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-600">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-slate-400">QA Evidence System</p>
                </div>
            </div>
            
            {/* Static Form View for PDF */}
            <EvidenceForm 
               onSubmit={() => {}} 
               onWizardSave={() => {}}
               evidences={evidences}
               initialTicketInfo={modalTicketInfo}
               // We pass a readonly mode implicitly by not providing handlers or by structure?
               // Actually EvidenceForm fields are inputs. For PDF, they render as inputs with values.
               // HTML2PDF captures them fine.
            />

            <div className="mt-8">
                <div className="bg-slate-800 text-white px-4 py-2 rounded-t-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Detalhamento dos Testes
                </div>
                <EvidenceList 
                    evidences={evidences} 
                    onDelete={() => {}} // No delete in PDF
                />
            </div>
            
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                <span>Responsável: {currentUser.name}</span>
                <span>Confidencial - Uso Interno</span>
            </div>
         </div>
      </div>
      
      {/* Hidden History Print Container */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1200px' }}>
         <div ref={historyPrintRef} className="bg-white p-10 min-h-screen">
            {ticketToPrint && (
                <>
                    <div className="flex justify-between items-center mb-8 border-b-2 border-slate-800 pb-4">
                        <h1 className="text-2xl font-bold text-slate-900">Relatório de Evidência de Teste (Histórico)</h1>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-600">Data Original: {ticketToPrint.ticketInfo.evidenceDate}</p>
                            <p className="text-xs text-slate-400">ID: {ticketToPrint.ticketInfo.ticketId}</p>
                        </div>
                    </div>
                    <EvidenceForm 
                        onSubmit={() => {}} 
                        onWizardSave={() => {}}
                        evidences={ticketToPrint.items}
                        initialTicketInfo={ticketToPrint.ticketInfo}
                    />
                    <div className="mt-8">
                         <div className="bg-slate-800 text-white px-4 py-2 rounded-t-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            <ListChecks className="w-4 h-4" />
                            Detalhamento dos Testes
                        </div>
                        <EvidenceList 
                            evidences={ticketToPrint.items} 
                            onDelete={() => {}}
                        />
                    </div>
                    <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                        <span>Responsável: {users.find(u => u.acronym === ticketToPrint.createdBy)?.name || ticketToPrint.createdBy}</span>
                        <span>Confidencial - Uso Interno</span>
                    </div>
                </>
            )}
         </div>
      </div>

    </div>
  );
};

export default App;
