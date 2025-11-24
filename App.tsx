

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import EvidenceForm from './components/EvidenceForm';
import EvidenceList from './components/EvidenceList';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import EvidenceManagement from './components/EvidenceManagement';
import DashboardMetrics from './components/DashboardMetrics';
import BugReportForm from './components/BugReportForm';
import { EvidenceItem, TicketInfo, TestCaseDetails, ArchivedTicket, TestStatus, User, TicketPriority, BugReport } from './types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './constants';
import { FileCheck, AlertTriangle, Archive, Calendar, User as UserIcon, Layers, ListChecks, CheckCircle2, XCircle, AlertCircle, ShieldCheck, CheckCheck, FileText, X, Save, FileDown, Loader2, Clock, LayoutDashboard, Hash, ArrowRight, Download, Trash2, ChevronLeft, ChevronRight, ChevronDown, Lock, ClipboardCheck, Activity, History, Bug, Monitor } from 'lucide-react';

declare const html2pdf: any;

export interface WizardTriggerContext {
  mode: 'create' | 'edit';
  scenarioNumber: number;
  nextCaseNumber: number;
  ticketInfo: TicketInfo;
  evidenceId?: string;
  existingDetails?: TestCaseDetails;
}

// Helper to get Brazil Date (GMT-3)
const getBrazilCurrentDate = () => {
  const date = new Date();
  return new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
};

const getBrazilDateString = () => {
  const d = getBrazilCurrentDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const App: React.FC = () => {
  // --- AUTHENTICATION & USER STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'evidences' | 'dashboard'>('users');

  // --- MODULE STATE ---
  const [activeModule, setActiveModule] = useState<'TICKET' | 'BUGS'>('TICKET');

  // --- DATA STATE ---
  const [evidences, setEvidences] = useState<EvidenceItem[]>([]);
  const [ticketHistory, setTicketHistory] = useState<ArchivedTicket[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  
  // Bug Report State
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  
  const [formKey, setFormKey] = useState(0);
  const [editingTicketInfo, setEditingTicketInfo] = useState<TicketInfo | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [printingTicket, setPrintingTicket] = useState<ArchivedTicket | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<'PDF' | 'SAVE'>('PDF');
  
  // State for Ticket Deletion
  const [ticketToDelete, setTicketToDelete] = useState<ArchivedTicket | null>(null);
  
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [wizardTrigger, setWizardTrigger] = useState<WizardTriggerContext | null>(null);
  
  const formTicketInfoRef = useRef<TicketInfo | null>(null);
  const historyCarouselRef = useRef<HTMLDivElement>(null);

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

    // Load Bugs
    const storedBugs = localStorage.getItem('narnia_bugs');
    if (storedBugs) {
        setBugReports(JSON.parse(storedBugs));
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

  // Save Bugs when changed
  useEffect(() => {
     localStorage.setItem('narnia_bugs', JSON.stringify(bugReports));
  }, [bugReports]);

  // Helper to generate default ticket info with analyst pre-filled
  const getDefaultTicketInfo = (userAcronym: string): TicketInfo => ({
    sprint: '',
    ticketId: '',
    ticketTitle: '',
    ticketSummary: '',
    clientSystem: '',
    requester: '',
    priority: TicketPriority.MEDIUM,
    analyst: userAcronym,
    requestDate: '',
    environment: '',
    environmentVersion: '',
    evidenceDate: '',
    ticketDescription: '',
    solution: ''
  });

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
      setEditingTicketInfo(getDefaultTicketInfo(user.acronym));
      // Set default admin tab: Evidences for Admin, Users for regular user
      setAdminTab(user.role === 'ADMIN' ? 'evidences' : 'users');
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

  const handleDeleteScenario = (scenarioNum: number) => {
    if (!window.confirm(`Tem certeza que deseja excluir todo o Cenário #${scenarioNum} e seus casos de teste?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setEvidences(prev => prev.filter(e => {
        // Keep items that don't belong to any scenario (manual)
        if (!e.testCaseDetails) return true; 
        
        // Remove items that match the scenario number
        return Number(e.testCaseDetails.scenarioNumber) !== Number(scenarioNum);
    }));
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
        if (!window.confirm('Tem certeza que deseja limpar todos os dados e reiniciar o fluxo?')) {
            return;
        }
    }
    
    setEvidences([]);
    setWizardTrigger(null);
    
    // Reset to default state with current user as analyst
    if (currentUser) {
        setEditingTicketInfo(getDefaultTicketInfo(currentUser.acronym));
    } else {
        setEditingTicketInfo(null);
    }
    
    setEditingHistoryId(null);
    setPdfError(null);
    formTicketInfoRef.current = null; // Explicitly clear the form reference
    
    setFormKey(prev => prev + 1); // Force remount of form
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- BUG REPORT HANDLERS ---
  const handleSaveBug = (bug: BugReport) => {
     // Check if updating
     if (bugReports.some(b => b.id === bug.id)) {
        setBugReports(prev => prev.map(b => b.id === bug.id ? bug : b));
     } else {
        setBugReports([bug, ...bugReports]);
     }
  };

  const handleDeleteBug = (id: string) => {
      if (window.confirm("Deseja realmente excluir este BUG?")) {
          setBugReports(prev => prev.filter(b => b.id !== id));
      }
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
       { key: 'requester', label: 'Solicitante' }
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
      const masterTicketInfo = formTicketInfoRef.current || (evidences.length > 0 ? evidences[0].ticketInfo : null);
      
      if (!masterTicketInfo) return;

      // UPDATE EVIDENCE DATE TO TODAY (Requirement: Save/Update always captures latest date in Brazil Time)
      const today = getBrazilDateString();
      const finalTicketInfo = { ...masterTicketInfo, evidenceDate: today };

      const consistentEvidences = evidences.map(ev => ({
         ...ev,
         ticketInfo: finalTicketInfo,
         createdBy: currentUser.acronym
      }));

      if (editingHistoryId) {
         setTicketHistory(prev => prev.map(t => {
            if (t.id === editingHistoryId) {
                return {
                    ...t,
                    ticketInfo: finalTicketInfo,
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
            ticketInfo: finalTicketInfo,
            items: consistentEvidences,
            archivedAt: Date.now(),
            createdBy: currentUser.acronym
          };
          setTicketHistory(prev => [archivedTicket, ...prev]);
      }

      // Clear Workspace and Reset to Default (Preserving Analyst)
      setEvidences([]);
      setWizardTrigger(null);
      setEditingHistoryId(null);
      setEditingTicketInfo(getDefaultTicketInfo(currentUser.acronym));
      formTicketInfoRef.current = null;
      setFormKey(prev => prev + 1);
  };

  // Button 1: Save & Close (Histórico) - Uses same modal flow as PDF
  const handleSaveAndClose = () => {
    // Validation removed as requested to allow saving drafts/incomplete data
    // if (!validateTicketRequirements()) return; 
    setConfirmationMode('SAVE');
    setShowPdfModal(true);
  };

  // Button 2: Generate PDF (and Save)
  const handlePdfFlow = () => {
    if (evidences.length === 0) {
        setPdfError("Não há evidências para gerar o PDF. Adicione pelo menos um caso.");
        return;
    }
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
  
  const handleConfirmDelete = () => {
    if (!ticketToDelete) return;
    
    setTicketHistory(prev => prev.filter(t => t.id !== ticketToDelete.id));
    
    // If we are currently editing this ticket, cancel the edit
    if (editingHistoryId === ticketToDelete.id) {
        handleCancelEdit();
    }
    
    setTicketToDelete(null);
  };

  const handleDownloadArchivedPdf = (ticket: ArchivedTicket) => {
    setPrintingTicket(ticket);
    setIsGeneratingPdf(true);
    // setTimeout removed, PDF generation is now triggered by the useEffect below
  };

  const executePdfGeneration = (isArchived: boolean = false) => {
    if (!reportRef.current || !currentUser) return;

    if (!isArchived) setShowPdfModal(false);
    setIsGeneratingPdf(true);
    
    const targetTicketInfo = isArchived && printingTicket ? printingTicket.ticketInfo : (formTicketInfoRef.current || evidences[0]?.ticketInfo);
    if (!targetTicketInfo) {
        setIsGeneratingPdf(false);
        setPrintingTicket(null);
        return;
    }

    const ticketTitle = targetTicketInfo.ticketTitle;
    const safeFilename = ticketTitle.replace(/[/\\?%*:|"<>]/g, '-');
    const authorName = isArchived && printingTicket 
        ? users.find(u => u.acronym === printingTicket.createdBy)?.name || printingTicket.createdBy 
        : currentUser.name;

    // Strict Margins for Header (35mm) and Footer (25mm)
    // Left/Right margin 10mm
    const opt = {
      margin: [35, 10, 25, 10], 
      filename: `${safeFilename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(reportRef.current).toPdf().get('pdf').then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        for (let i = 1; i <= totalPages; i++) {
             pdf.setPage(i);
             
             // --- HEADER (Top 0mm to 35mm) ---
             
             // Background for Header (White - implied)
             // pdf.setFillColor(255, 255, 255);
             // pdf.rect(0, 0, pageWidth, 35, 'F');

             // Logo Box (Left)
             pdf.setFillColor(15, 23, 42); // slate-900
             pdf.rect(10, 10, 12, 12, 'F'); // x=10mm, y=10mm
             pdf.setTextColor(255, 255, 255);
             pdf.setFontSize(10);
             pdf.setFont("helvetica", "bold");
             pdf.text("QA", 11.5, 17.5);

             // Main Title
             pdf.setTextColor(15, 23, 42); // slate-900
             pdf.setFontSize(14);
             pdf.setFont("helvetica", "bold");
             pdf.text("RELATÓRIO DE EVIDÊNCIAS", 26, 16);
             
             // Subtitle
             pdf.setFontSize(9);
             pdf.setTextColor(100, 116, 139); // slate-500
             pdf.setFont("helvetica", "normal");
             pdf.text("CONTROLE DE QUALIDADE NARNIA", 26, 21);

             // Ticket ID (Right)
             if (targetTicketInfo.ticketId) {
                 pdf.setFontSize(16);
                 pdf.setTextColor(15, 23, 42);
                 pdf.setFont("helvetica", "bold");
                 pdf.text(targetTicketInfo.ticketId, pageWidth - 10, 18, { align: 'right' });
             }

             // Horizontal Line Separator (at y=30mm)
             pdf.setDrawColor(15, 23, 42);
                     pdf.setLineWidth(0.5);
             pdf.line(10, 30, pageWidth - 10, 30);


             // --- FOOTER (Bottom 25mm) ---
             
             // Footer Line Separator (at pageHeight - 15mm)
             const footerLineY = pageHeight - 15;
             pdf.setDrawColor(203, 213, 225); // slate-300
             pdf.setLineWidth(0.3);
             pdf.line(10, footerLineY, pageWidth - 10, footerLineY);

             // Left: Metadata
             pdf.setFontSize(8);
             pdf.setTextColor(100, 116, 139); // slate-500
             pdf.setFont("helvetica", "normal");
             pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} por ${authorName}`, 10, pageHeight - 8);

             // Right: Page Number
             pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 10, pageHeight - 8, { align: 'right' });
        }
    }).save().then(() => {
      if (!isArchived) persistCurrentTicket();
      setIsGeneratingPdf(false);
      setPrintingTicket(null);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  };

  // Add this effect to handle PDF generation when state updates to avoid stale closures
  useEffect(() => {
    if (printingTicket && isGeneratingPdf) {
      const timer = setTimeout(() => {
        executePdfGeneration(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingTicket, isGeneratingPdf]);

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
    setActiveModule('TICKET'); // Ensure we switch back to Ticket mode

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      // RULE: If no items, return Pending
      if (!items || items.length === 0) {
           return [STATUS_CONFIG[TestStatus.PENDING]];
      }

      const statuses = new Set<TestStatus>();
      items.forEach(i => {
          if (i.status === TestStatus.SKIPPED) statuses.add(TestStatus.PENDING); // Normalize skipped to pending visually
          else statuses.add(i.status);
      });
      
      // If items exist but somehow no status recorded (unlikely given TS), fallback
      if (statuses.size === 0) {
           return [STATUS_CONFIG[TestStatus.PENDING]];
      }

      // Sort logic: Fail > Blocked > Pass > Pending
      const sortedStatuses = Array.from(statuses).sort((a, b) => {
          const order = { [TestStatus.FAIL]: 0, [TestStatus.BLOCKED]: 1, [TestStatus.PASS]: 2, [TestStatus.PENDING]: 3, [TestStatus.SKIPPED]: 3 };
          return (order[a] || 99) - (order[b] || 99);
      });

      return sortedStatuses.map(status => STATUS_CONFIG[status]);
  };

  const getCurrentTicketInfo = () => {
    if (printingTicket) return printingTicket.ticketInfo;
    if (evidences.length > 0) return evidences[0].ticketInfo;
    if (formTicketInfoRef.current) return formTicketInfoRef.current;
    return null;
  };

  // Carousel Scroll Logic
  const scrollHistory = (direction: 'left' | 'right') => {
    if (historyCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      historyCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  
  const modalTicketInfo = getCurrentTicketInfo();
  
  // Sort items for PDF History Table
  const pdfItems = useMemo(() => {
    const items = printingTicket ? printingTicket.items : evidences;
    return [...items].sort((a, b) => {
      const da = a.testCaseDetails || { scenarioNumber: 999, caseNumber: 999 };
      const db = b.testCaseDetails || { scenarioNumber: 999, caseNumber: 999 };
      if (da.scenarioNumber !== db.scenarioNumber) return da.scenarioNumber - db.scenarioNumber;
      return da.caseNumber - db.caseNumber;
    });
  }, [printingTicket, evidences]);

  // --- FILTERING FOR UI ---
  // User sees ONLY their tickets.
  const displayedHistory = ticketHistory.filter(t => t.createdBy === currentUser?.acronym);

  // --- RENDER ---

  if (!currentUser) {
     return <Login onLogin={handleLogin} error={loginError} />;
  }
  
  const isPdfMode = confirmationMode === 'PDF';
  const isPdfLocked = evidences.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header user={currentUser} onLogout={handleLogout} />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* User Management Panel Toggle */}
        {currentUser && (
            <div className="mb-8 flex justify-between items-center">
                {/* MODULE SWITCHER - ONLY VISIBLE IF NOT ADMIN PANEL */}
                {!showAdminPanel ? (
                   <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 inline-flex">
                      <button 
                         onClick={() => setActiveModule('TICKET')}
                         className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeModule === 'TICKET' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                         }`}
                      >
                         <FileText className="w-4 h-4" />
                         Tela de Chamado
                      </button>
                      <button 
                         onClick={() => setActiveModule('BUGS')}
                         className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeModule === 'BUGS' 
                            ? 'bg-red-600 text-white shadow-md' 
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                         }`}
                      >
                         <Bug className="w-4 h-4" />
                         Registro de BUGs
                      </button>
                   </div>
                ) : <div></div>}

                <button 
                    onClick={() => {
                        if (!showAdminPanel && currentUser.role === 'ADMIN') {
                             setAdminTab('evidences');
                        }
                        setShowAdminPanel(!showAdminPanel);
                    }}
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
                     <EvidenceManagement 
                        tickets={ticketHistory} 
                        users={users} 
                        onDeleteTicket={(t) => setTicketToDelete(t)} 
                        currentUser={currentUser}
                        onOpenTicket={handleOpenArchivedTicket}
                    />
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
               {activeModule === 'TICKET' ? (
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
                            onCancel={editingHistoryId ? handleCancelEdit : undefined}
                        />
                        
                        {/* List Header (Title Only) */}
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
                                    <div className="mt-2 inline-flex items-center gap-2 animate-fade-in">
                                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5 shadow-sm">
                                        <Archive className="w-3.5 h-3.5" /> 
                                        MODO DE EDIÇÃO: HISTÓRICO
                                    </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <EvidenceList 
                            evidences={evidences}
                            onDelete={handleDeleteEvidence}
                            onDeleteScenario={handleDeleteScenario}
                            onAddCase={handleAddCase}
                            onEditCase={handleEditCase}
                        />

                        {/* FINAL ACTIONS - COMPACT & VIVID */}
                        <div className={`mb-32 ${!(evidences.length > 0 || editingHistoryId) ? 'mt-16' : 'mt-12'}`}>
                            <div className="flex flex-col items-center justify-center">
                                <div className="flex flex-wrap gap-4 justify-center">
                                    {/* Save Button */}
                                    <button
                                        onClick={handleSaveAndClose}
                                        disabled={false}
                                        className="group relative overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 px-8 py-3 text-white shadow-xl shadow-emerald-200/40 transition-all hover:shadow-emerald-300/60 hover:-translate-y-1 active:scale-95 w-full sm:w-auto min-w-[160px] ring-1 ring-white/20"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                        <div className="relative flex items-center justify-center gap-2 font-bold text-sm tracking-widest uppercase">
                                            <Save className="w-5 h-5" />
                                            Salvar
                                        </div>
                                    </button>

                                    {/* PDF Button */}
                                    <button
                                        onClick={handlePdfFlow}
                                        disabled={isGeneratingPdf}
                                        className={`group relative overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-3 text-white shadow-xl shadow-blue-200/40 transition-all hover:shadow-blue-300/60 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:grayscale w-full sm:w-auto min-w-[160px] ring-1 ring-white/20 ${isPdfLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                        <div className="relative flex items-center justify-center gap-2 font-bold text-sm tracking-widest uppercase">
                                            {isGeneratingPdf ? (
                                                <Loader2 className="w-5 h-5 animate-spin" /> 
                                            ) : isPdfLocked ? (
                                                <div className="relative w-5 h-5 flex items-center justify-center">
                                                    <FileDown className="w-5 h-5 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-75" />
                                                    <Lock className="w-5 h-5 absolute transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-100" />
                                                </div>
                                            ) : (
                                                <FileDown className="w-5 h-5" />
                                            )}
                                            Gerar PDF
                                        </div>
                                    </button>
                                </div>
                                
                                {pdfError && (
                                    <div className="mt-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 animate-pulse max-w-lg text-center shadow-sm">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        {pdfError}
                                    </div>
                                )}
                            </div>
                        </div>
                   </>
               ) : (
                   <BugReportForm 
                       userAcronym={currentUser.acronym} 
                       userName={currentUser.name}
                       onSave={handleSaveBug}
                       bugs={bugReports}
                       onDelete={handleDeleteBug}
                   />
               )}
             </>
        )}

        {!showAdminPanel && activeModule === 'TICKET' && displayedHistory.length > 0 && (
             <div className="mt-16 pt-10 border-t border-slate-200 animate-fade-in">
                 <div 
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="flex items-center justify-between cursor-pointer group mb-8 select-none"
                 >
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                            <Archive className="w-6 h-6 text-indigo-600" />
                        </div>
                        Histórico de Chamados
                    </h3>
                    <div className={`p-2 rounded-full text-slate-400 group-hover:bg-slate-100 group-hover:text-indigo-600 transition-all duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                         <ChevronDown className="w-6 h-6" />
                    </div>
                 </div>
                 
                 {/* CAROUSEL WRAPPER */}
                 {isHistoryExpanded && (
                     <div className="relative group/carousel animate-fade-in">
                         
                         {/* LEFT NAV BUTTON */}
                         <button 
                            onClick={(e) => { e.stopPropagation(); scrollHistory('left'); }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 p-3 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all hidden md:flex items-center justify-center"
                         >
                             <ChevronLeft className="w-6 h-6" />
                         </button>

                         {/* RIGHT NAV BUTTON */}
                         <button 
                            onClick={(e) => { e.stopPropagation(); scrollHistory('right'); }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 p-3 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:scale-110 transition-all hidden md:flex items-center justify-center"
                         >
                             <ChevronRight className="w-6 h-6" />
                         </button>

                         {/* SCROLLABLE CONTAINER */}
                         <div 
                            ref={historyCarouselRef}
                            className="flex overflow-x-auto gap-6 pb-8 px-2 scroll-smooth snap-x snap-mandatory scrollbar-hide"
                         >
                            {displayedHistory.map(ticket => {
                                const statusBadges = getTicketStatusBadges(ticket.items);
                                const uniqueScenarios = new Set(ticket.items.filter(i => i.testCaseDetails).map(i => i.testCaseDetails?.scenarioNumber)).size;
                                const totalCases = ticket.items.filter(i => i.testCaseDetails).length;
                                const caseIds = [...new Set(ticket.items.map(i => i.testCaseDetails?.caseId).filter(Boolean))].sort(); 
                                const priority = ticket.ticketInfo.priority || TicketPriority.MEDIUM;
                                const PriorityConfig = PRIORITY_CONFIG[priority];

                                return (
                                    <div key={ticket.id} className="w-[350px] h-[550px] snap-center flex-shrink-0 pb-4">
                                        <div 
                                            onClick={() => handleOpenArchivedTicket(ticket)}
                                            className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer group relative overflow-hidden flex flex-col h-full select-none hover:-translate-y-2"
                                        >
                                            {/* Decorative Top Gradient Line */}
                                            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                                            {/* HEADER */}
                                            <div className="p-6 pb-2">
                                                <div className="flex justify-between items-start mb-4">
                                                    {/* ID */}
                                                    <div className="flex flex-col">
                                                         <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Chamado</span>
                                                         <span className="font-mono text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                                                            {ticket.ticketInfo.ticketId || 'N/A'}
                                                         </span>
                                                    </div>
                                                    
                                                    {/* PRIORITY TAG */}
                                                    <div className="flex flex-col items-center">
                                                         <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Prioridade</span>
                                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${PriorityConfig.color}`}>
                                                            {PriorityConfig.label}
                                                         </span>
                                                    </div>

                                                    {/* Analyst */}
                                                    <div className="flex flex-col items-end">
                                                         <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Analista</span>
                                                         <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="font-bold text-xs text-slate-700">{ticket.ticketInfo.analyst || ticket.createdBy}</span>
                                                         </div>
                                                    </div>
                                                </div>

                                                {/* Status Badges */}
                                                <div className="flex flex-wrap gap-2 justify-start min-h-[28px]">
                                                    {statusBadges.map((conf, idx) => {
                                                        const Icon = conf.icon;
                                                        return (
                                                            <span key={idx} className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider shadow-sm ${conf.color}`}>
                                                                <Icon className="w-3 h-3 mr-1.5" />
                                                                {conf.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* TITLE */}
                                            <div className="px-6 py-2 flex items-center justify-center text-center flex-grow max-h-[100px]">
                                                 <h4 className="text-base font-bold text-slate-800 leading-snug line-clamp-3 group-hover:text-indigo-600 transition-colors duration-300" title={ticket.ticketInfo.ticketTitle}>
                                                      {ticket.ticketInfo.ticketTitle || 'Sem Título'}
                                                 </h4>
                                            </div>

                                            {/* STATS */}
                                            <div className="px-6 py-2">
                                                 <div className="grid grid-cols-2 gap-4">
                                                     <div className="bg-slate-50 border border-slate-100 rounded-2xl py-3 px-2 flex flex-col items-center justify-center transition-colors group-hover:bg-indigo-50/30 group-hover:border-indigo-100">
                                                         <div className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-0.5">
                                                             <Layers className="w-5 h-5 text-indigo-500" />
                                                             {uniqueScenarios}
                                                         </div>
                                                         <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Cenários</span>
                                                     </div>
                                                     <div className="bg-slate-50 border border-slate-100 rounded-2xl py-3 px-2 flex flex-col items-center justify-center transition-colors group-hover:bg-emerald-50/30 group-hover:border-emerald-100">
                                                         <div className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-0.5">
                                                             <ListChecks className="w-5 h-5 text-emerald-500" />
                                                             {totalCases}
                                                         </div>
                                                         <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Casos</span>
                                                     </div>
                                                 </div>
                                            </div>

                                            {/* IDS */}
                                            <div className="px-6 py-3">
                                                 <div className="flex flex-wrap gap-1.5 justify-center max-h-[60px] overflow-hidden relative mask-linear-fade">
                                                      {caseIds.length > 0 ? caseIds.map((id, idx) => (
                                                          <span key={idx} className="inline-block px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-500 shadow-sm">
                                                              {id}
                                                          </span>
                                                      )) : <span className="text-[10px] text-slate-300 italic">Sem IDs</span>}
                                                 </div>
                                            </div>

                                            {/* FOOTER */}
                                            <div className="mt-auto bg-slate-50 p-5 border-t border-slate-100 flex items-center justify-between">
                                                 <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                      </div>
                                                      {ticket.ticketInfo.evidenceDate ? ticket.ticketInfo.evidenceDate.split('-').reverse().join('/') : new Date(ticket.archivedAt).toLocaleDateString('pt-BR')}
                                                 </div>
                                                 
                                                 <div className="flex items-center gap-2">
                                                      <button 
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleDownloadArchivedPdf(ticket);
                                                          }}
                                                          disabled={isGeneratingPdf}
                                                          className="p-2.5 rounded-xl text-emerald-600 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                                                          title="Baixar PDF"
                                                      >
                                                          {isGeneratingPdf && printingTicket?.id === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                                      </button>
                                                      <button
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              setTicketToDelete(ticket);
                                                          }}
                                                          className="p-2.5 rounded-xl text-red-500 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-all shadow-sm hover:shadow-md"
                                                          title="Excluir Chamado"
                                                      >
                                                          <Trash2 className="w-4 h-4" />
                                                      </button>
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                     </div>
                 )}
             </div>
        )}

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

      {/* Delete Confirmation Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setTicketToDelete(null)}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-slate-100">
             <div className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setTicketToDelete(null)}>
               <X className="w-5 h-5" />
             </div>

             <div className="flex flex-col items-center text-center">
               <div className="bg-red-100 p-4 rounded-full mb-4 border border-red-200">
                 <Trash2 className="w-8 h-8 text-red-600" />
               </div>
               
               <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Histórico</h3>
               <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                 Tem certeza que deseja remover permanentemente este registro? Esta ação não pode ser desfeita.
               </p>

               <div className="w-full bg-slate-50 rounded-lg p-4 mb-6 text-left text-sm border border-slate-200">
                  <p className="mb-2 border-b border-slate-200 pb-2"><span className="font-bold text-slate-700 block text-xs uppercase">Chamado</span> {ticketToDelete.ticketInfo.ticketId}</p>
                  <p className="line-clamp-2"><span className="font-bold text-slate-700 block text-xs uppercase">Título</span> {ticketToDelete.ticketInfo.ticketTitle}</p>
               </div>

               <div className="flex gap-3 w-full">
                 <button 
                   type="button"
                   onClick={() => setTicketToDelete(null)}
                   className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="button"
                   onClick={handleConfirmDelete}
                   className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
                 >
                   Excluir
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Hidden Report Container for Main PDF - REFACTORED FOR HEADER/CONTENT/FOOTER */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
         {/* Removing padding-4, ensuring margin-0 */}
         <div ref={reportRef} className="bg-white font-inter text-slate-900 relative w-full" style={{ margin: 0, padding: 0 }}>
            <main className="w-full">
                {/* SECTION: TICKET INFORMATION */}
                {/* Added mt-0 to ensure first element touches the 'ceiling' of the margin */}
                <div className="mb-0 space-y-4"> 
                    
                    {/* ROW 1: TITLE */}
                    <div className="border-b-2 border-slate-900 pb-4 mb-6">
                        <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight leading-tight m-0 p-0">
                            {(printingTicket ? printingTicket.ticketInfo.ticketTitle : modalTicketInfo?.ticketTitle) || 'Sem Título'}
                        </h1>
                    </div>

                    {/* GRID INFO */}
                    <div className="grid grid-cols-4 gap-y-4 gap-x-6 text-left">
                        {/* ROW 2 */}
                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Chamado (ID)</label>
                            <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{(printingTicket ? printingTicket.ticketInfo.ticketId : modalTicketInfo?.ticketId) || '-'}</p>
                        </div>
                        <div className="col-span-1">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Prioridade</label>
                             {(() => {
                                const p = (printingTicket ? printingTicket.ticketInfo.priority : modalTicketInfo?.priority) || TicketPriority.MEDIUM;
                                const conf = PRIORITY_CONFIG[p];
                                return (
                                    <p className={`text-sm font-bold border-b border-slate-200 pb-1 flex items-center gap-1`}>
                                        <span className={`inline-block w-2 h-2 rounded-full ${conf.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                        {conf.label}
                                    </p>
                                );
                             })()}
                        </div>
                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Data Solicitação</label>
                            <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{(printingTicket ? printingTicket.ticketInfo.requestDate?.split('-').reverse().join('/') : modalTicketInfo?.requestDate?.split('-').reverse().join('/')) || '-'}</p>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Data Evidência</label>
                            <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">
                                {printingTicket 
                                    ? (printingTicket.ticketInfo.evidenceDate?.split('-').reverse().join('/') || '-') 
                                    : getBrazilCurrentDate().toLocaleDateString('pt-BR')
                                }
                            </p>
                        </div>

                        {/* ROW 3 */}
                        <div className="col-span-1">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Sprint</label>
                             <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{(printingTicket ? printingTicket.ticketInfo.sprint : modalTicketInfo?.sprint) || '-'}</p>
                        </div>
                        <div className="col-span-1">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Analista</label>
                             <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{(printingTicket ? printingTicket.ticketInfo.analyst : (modalTicketInfo?.analyst || currentUser?.acronym))}</p>
                        </div>
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Solicitante</label>
                             <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{(printingTicket ? printingTicket.ticketInfo.requester : modalTicketInfo?.requester) || '-'}</p>
                        </div>

                        {/* ROW 4 */}
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Ambiente</label>
                             <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{(printingTicket ? printingTicket.ticketInfo.environment : modalTicketInfo?.environment) || '-'}</p>
                        </div>
                        <div className="col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Versão</label>
                             <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{(printingTicket ? printingTicket.ticketInfo.environmentVersion : modalTicketInfo?.environmentVersion) || '-'}</p>
                        </div>
                        
                        <div className="col-span-4">
                             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Cliente / Sistema</label>
                             <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{(printingTicket ? printingTicket.ticketInfo.clientSystem : modalTicketInfo?.clientSystem) || '-'}</p>
                        </div>
                    </div>

                    {/* ROW 5: DESCRIPTION */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição do Chamado</label>
                        <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{(printingTicket ? printingTicket.ticketInfo.ticketDescription : modalTicketInfo?.ticketDescription) || 'Nenhuma descrição fornecida.'}</p>
                    </div>

                    {/* ROW 6: SOLUTION */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Solução / Correção Aplicada</label>
                        <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{(printingTicket ? printingTicket.ticketInfo.solution : modalTicketInfo?.solution) || 'Não aplicável.'}</p>
                    </div>
                </div>

                {/* PAGE 2: HISTÓRICO DE TESTES (SUMMARY TABLE) */}
                <div className="pt-8" style={{ pageBreakBefore: 'always' }}>
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-900 pb-2">
                        <History className="w-5 h-5" /> Histórico de Testes
                    </h2>
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-3 py-2 border-b border-slate-200 w-16">#</th>
                                <th className="px-3 py-2 border-b border-slate-200 w-24">ID</th>
                                <th className="px-3 py-2 border-b border-slate-200 w-32">Tela</th>
                                <th className="px-3 py-2 border-b border-slate-200">Funcionalidade / Objetivo</th>
                                <th className="px-3 py-2 border-b border-slate-200 w-24 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pdfItems.filter(i => i.testCaseDetails).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400">Nenhum caso de teste registrado.</td>
                                </tr>
                            ) : (
                                pdfItems.filter(i => i.testCaseDetails).map((item) => {
                                    const details = item.testCaseDetails!;
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className="bg-slate-50/50">
                                                <td className="px-3 py-2 border-b border-slate-100 font-mono text-slate-500 align-top">{details.scenarioNumber}.{details.caseNumber}</td>
                                                <td className="px-3 py-2 border-b border-slate-100 font-mono font-bold text-slate-600 align-top">{details.caseId}</td>
                                                <td className="px-3 py-2 border-b border-slate-100 font-medium text-slate-700 align-top">{details.screen}</td>
                                                <td className="px-3 py-2 border-b border-slate-100 text-slate-600 align-top">{details.objective}</td>
                                                <td className="px-3 py-2 border-b border-slate-100 text-center align-top">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        item.status === TestStatus.PASS ? 'bg-emerald-100 text-emerald-800' :
                                                        item.status === TestStatus.FAIL ? 'bg-red-100 text-red-800' :
                                                        item.status === TestStatus.BLOCKED ? 'bg-amber-100 text-amber-800' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {STATUS_CONFIG[item.status].label}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 border-b border-slate-200 bg-white">
                                                     <div className="grid grid-cols-3 gap-4 text-[10px]">
                                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                            <span className="font-bold text-indigo-900 block mb-1 uppercase">Pré-Requisito</span>
                                                            <p className="text-slate-700 whitespace-pre-line leading-relaxed">{details.preRequisite || '-'}</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                            <span className="font-bold text-indigo-900 block mb-1 uppercase">Descrição do Teste</span>
                                                            <p className="text-slate-700 whitespace-pre-line leading-relaxed">{details.condition || '-'}</p>
                                                        </div>
                                                        <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                                                            <span className="font-bold text-indigo-900 block mb-1 uppercase">Resultado Esperado</span>
                                                            <p className="text-indigo-800 whitespace-pre-line leading-relaxed">{details.expectedResult || '-'}</p>
                                                        </div>
                                                     </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* EVIDENCES - FORCED PAGE BREAK BEFORE */}
                <div className="pt-0 mt-0" style={{ pageBreakBefore: 'always', marginTop: 0 }}>
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-900 pb-2">
                        <ListChecks className="w-5 h-5" /> Detalhamento da Execução
                    </h2>
                    <EvidenceList 
                        evidences={printingTicket ? printingTicket.items : evidences} 
                        onDelete={() => {}} 
                        readOnly={true}
                    />
                </div>
            </main>
         </div>
      </div>
      
    </div>
  );
};

export default App;