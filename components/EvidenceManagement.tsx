import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArchivedTicket, User, EvidenceItem, TestStatus, TicketPriority, TicketStatus } from '../types';
import { STATUS_CONFIG, PRIORITY_CONFIG, TICKET_STATUS_CONFIG } from '../constants';
import { Search, FileDown, ChevronDown, Calendar, Hash, FolderOpen, Trash2, ListChecks, Edit, Lock, Ban, History, Timer, Loader2, Check } from 'lucide-react';
import EvidenceList from './EvidenceList';

declare const html2pdf: any;

interface EvidenceManagementProps {
  tickets: ArchivedTicket[];
  users: User[];
  onDeleteTicket: (ticket: ArchivedTicket) => void;
  currentUser: User;
  onOpenTicket: (ticket: ArchivedTicket) => void;
}

const EvidenceManagement: React.FC<EvidenceManagementProps> = ({ tickets, users, onDeleteTicket, currentUser, onOpenTicket }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSprint, setSelectedSprint] = useState<string>('ALL');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [printingTicketId, setPrintingTicketId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  
  // Custom Dropdown State
  const [isSprintOpen, setIsSprintOpen] = useState(false);
  const sprintDropdownRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Extract Unique Sprints
  const availableSprints = useMemo(() => {
    const sprints = new Set<string>();
    tickets.forEach(t => {
        if (t.ticketInfo.sprint) sprints.add(t.ticketInfo.sprint);
    });
    return Array.from(sprints).sort((a, b) => {
        // Try numeric sort for sprints like "24", "25"
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });
  }, [tickets]);

  // Click Outside Handler for Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sprintDropdownRef.current && !sprintDropdownRef.current.contains(event.target as Node)) {
        setIsSprintOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Collapse all items when Sprint changes (Minimizado por padrão)
  useEffect(() => {
      setExpandedUsers(new Set());
  }, [selectedSprint]);

  const toggleUser = (acronym: string) => {
    const newSet = new Set(expandedUsers);
    if (newSet.has(acronym)) newSet.delete(acronym);
    else newSet.add(acronym);
    setExpandedUsers(newSet);
  };

  const handleTicketClick = (ticket: ArchivedTicket) => {
    // Permission Check: Only the creator (owner) can open/edit the ticket.
    if (currentUser.acronym === ticket.createdBy) {
        onOpenTicket(ticket);
    } else {
        // Show error for non-owners (including admins, as per requirement)
        setPermissionError(true);
        setTimeout(() => setPermissionError(false), 3000);
    }
  };

  const filteredData = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    
    return tickets.filter(ticket => {
      const user = users.find(u => u.acronym === ticket.createdBy);
      const userName = user ? user.name.toLowerCase() : '';
      const userAcronym = ticket.createdBy.toLowerCase();
      
      const title = ticket.ticketInfo.ticketTitle.toLowerCase();
      const date = (ticket.ticketInfo.evidenceDate || '').toLowerCase();
      const testIds = ticket.items.map(i => i.testCaseDetails?.caseId.toLowerCase()).join(' ');

      // Search Filter
      const matchesSearch = userName.includes(lowerSearch) || 
             userAcronym.includes(lowerSearch) ||
             title.includes(lowerSearch) ||
             date.includes(lowerSearch) ||
             testIds.includes(lowerSearch);

      // Sprint Filter
      const matchesSprint = selectedSprint === 'ALL' || ticket.ticketInfo.sprint === selectedSprint;

      return matchesSearch && matchesSprint;
    });
  }, [tickets, users, searchTerm, selectedSprint]);

  const groupedTickets = useMemo(() => {
    const groups: Record<string, ArchivedTicket[]> = {};
    filteredData.forEach(ticket => {
        const key = ticket.createdBy;
        if (!groups[key]) groups[key] = [];
        groups[key].push(ticket);
    });
    return groups;
  }, [filteredData]);

  const sortedUserKeys = Object.keys(groupedTickets).sort();

  const handleDownloadPdf = async (ticket: ArchivedTicket) => {
    setPrintingTicketId(ticket.id);
    
    // Allow time for the hidden component to render with new props
    setTimeout(() => {
        if (printRef.current) {
            const safeFilename = ticket.ticketInfo.ticketTitle.replace(/[/\\?%*:|"<>]/g, '-');
            
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

            html2pdf().set(opt).from(printRef.current).toPdf().get('pdf').then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const user = users.find(u => u.acronym === ticket.createdBy);
                
                for (let i = 1; i <= totalPages; i++) {
                     pdf.setPage(i);
                     
                     // --- HEADER (Top 0mm to 35mm) ---
                     
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
                     if (ticket.ticketInfo.ticketId) {
                         pdf.setFontSize(16);
                         pdf.setTextColor(15, 23, 42);
                         pdf.setFont("helvetica", "bold");
                         pdf.text(ticket.ticketInfo.ticketId, pageWidth - 10, 18, { align: 'right' });
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
                     pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} por ${user?.name || 'Sistema'}`, 10, pageHeight - 8);

                     // Right: Page Number
                     pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 10, pageHeight - 8, { align: 'right' });
                }
            }).save().then(() => {
                setPrintingTicketId(null);
            });
        }
    }, 800);
  };

  const getUniqueTicketStatuses = (items: EvidenceItem[]) => {
    if (!items || items.length === 0) {
        return [STATUS_CONFIG[TestStatus.PENDING]];
    }

    const seenLabels = new Set<string>();
    const resultConfigs = [];

    const priority = [TestStatus.FAIL, TestStatus.BLOCKED, TestStatus.PENDING, TestStatus.SKIPPED, TestStatus.PASS];
    
    const presentStatuses = new Set(items.map(i => i.status));
    
    for (const status of priority) {
        if (presentStatuses.has(status)) {
            const config = STATUS_CONFIG[status];
            if (!seenLabels.has(config.label)) {
                seenLabels.add(config.label);
                resultConfigs.push(config);
            }
        }
    }
    
    return resultConfigs;
  };

  const ticketToPrint = tickets.find(t => t.id === printingTicketId);

  const pdfItems = useMemo(() => {
    if (!ticketToPrint) return [];
    return [...ticketToPrint.items].sort((a, b) => {
      const da = a.testCaseDetails || { scenarioNumber: 999, caseNumber: 999 };
      const db = b.testCaseDetails || { scenarioNumber: 999, caseNumber: 999 };
      if (da.scenarioNumber !== db.scenarioNumber) return da.scenarioNumber - db.scenarioNumber;
      return da.caseNumber - db.caseNumber;
    });
  }, [ticketToPrint]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Permission Error Toast */}
      {permissionError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
           <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-red-600">
               <div className="bg-white/20 p-1 rounded-full">
                  <Ban className="w-4 h-4" />
               </div>
               <span className="font-bold text-sm">Você não tem permissão para editar este chamado.</span>
           </div>
        </div>
      )}

      {/* Header & Search */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-indigo-600" />
                    Gestão de Evidências
                </h2>
                <p className="text-sm text-slate-500 mt-1">Visualize e exporte evidências organizadas por usuário.</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                
                {/* Modern Sprint Filter */}
                <div className="relative group min-w-[180px]" ref={sprintDropdownRef}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                        <Timer className="w-4 h-4" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSprintOpen(!isSprintOpen)}
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-left text-sm font-bold text-slate-700 hover:bg-white transition-all shadow-sm flex items-center justify-between"
                    >
                        <span className="truncate">
                            {selectedSprint === 'ALL' ? 'Todas Sprints' : `Sprint ${selectedSprint}`}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSprintOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSprintOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-slide-down custom-scrollbar">
                            <div className="p-1.5 space-y-1">
                                <button
                                    onClick={() => { setSelectedSprint('ALL'); setIsSprintOpen(false); }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all ${selectedSprint === 'ALL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    <span>Todas Sprints</span>
                                    {selectedSprint === 'ALL' && <Check className="w-4 h-4" />}
                                </button>
                                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                {availableSprints.map(sprint => (
                                    <button
                                        key={sprint}
                                        onClick={() => { setSelectedSprint(sprint); setIsSprintOpen(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all ${selectedSprint === sprint ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <span>Sprint {sprint}</span>
                                        {selectedSprint === sprint && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por Sigla, Nome, ID..."
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {sortedUserKeys.map(acronym => {
            const userTickets = groupedTickets[acronym];
            const user = users.find(u => u.acronym === acronym);
            // Don't auto-expand based on Sprint, only on Search
            const isExpanded = expandedUsers.has(acronym) || searchTerm !== '';

            return (
                <div key={acronym} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                    <div 
                        className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : 'bg-white hover:bg-slate-50'}`}
                        onClick={() => toggleUser(acronym)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl text-white font-bold font-mono text-sm shadow-md shadow-indigo-200">
                                {acronym}
                            </div>
                            <div>
                                <span className="font-bold text-slate-800 text-lg block leading-tight">
                                    {user?.name || 'Usuário Desconhecido'}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                    {userTickets.length} evidências {selectedSprint !== 'ALL' ? 'nesta sprint' : 'registradas'}
                                </span>
                            </div>
                        </div>
                        <div className={`p-2 rounded-full bg-slate-100 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-100 text-indigo-600' : ''}`}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>

                    {(isExpanded) && (
                        <div className="divide-y divide-slate-100 bg-white">
                            {userTickets.map(ticket => {
                                const testIds = ticket.items.map(i => i.testCaseDetails?.caseId).filter(Boolean);
                                const date = ticket.ticketInfo.evidenceDate 
                                    ? ticket.ticketInfo.evidenceDate.split('-').reverse().join('/') 
                                    : new Date(ticket.archivedAt).toLocaleDateString('pt-BR');
                                
                                const statusConfigs = getUniqueTicketStatuses(ticket.items);
                                const isOwner = currentUser.acronym === ticket.createdBy;
                                const priority = ticket.ticketInfo.priority || TicketPriority.MEDIUM;
                                const PriorityConfig = PRIORITY_CONFIG[priority];
                                const ticketStatus = ticket.ticketInfo.ticketStatus || TicketStatus.PENDING;
                                const TicketStatusConfig = TICKET_STATUS_CONFIG[ticketStatus];
                                const TicketStatusIcon = TicketStatusConfig.icon;

                                return (
                                    <div 
                                        key={ticket.id} 
                                        onClick={() => handleTicketClick(ticket)}
                                        className={`p-5 flex flex-col md:flex-row items-center gap-5 transition-all group relative ${isOwner ? 'hover:bg-indigo-50/30 cursor-pointer' : 'hover:bg-slate-50 cursor-default'}`}
                                    >
                                        {/* Status Line Indicator */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${isOwner ? 'group-hover:bg-indigo-500' : 'group-hover:bg-slate-300'}`}></div>

                                        {/* Icon */}
                                        <div className={`hidden md:flex items-center justify-center w-10 h-10 rounded-full transition-all ${isOwner ? 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                                            {isOwner ? <Edit className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 w-full min-w-0">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
                                                {/* Title */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${PriorityConfig.color}`}>
                                                            {PriorityConfig.label}
                                                        </span>
                                                        {/* TICKET STATUS BADGE */}
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider shadow-sm ${TicketStatusConfig.color}`}>
                                                            <TicketStatusIcon className="w-3 h-3 mr-1" />
                                                            {TicketStatusConfig.label}
                                                        </span>
                                                        {ticket.ticketInfo.sprint && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                Sprint {ticket.ticketInfo.sprint}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className={`font-bold text-base leading-snug transition-colors flex-1 min-w-0 break-words pr-4 ${isOwner ? 'text-slate-800 group-hover:text-indigo-700' : 'text-slate-600'}`}>
                                                        {ticket.ticketInfo.ticketTitle}
                                                    </h4>
                                                </div>
                                                
                                                {/* Status Badges - Multiple - Constrained width to force multiline/compact display if needed */}
                                                <div className="flex flex-wrap gap-1.5 md:justify-end mt-1 md:mt-0 flex-shrink-0 md:w-[130px]">
                                                    {statusConfigs.map((config, idx) => {
                                                        const StatusIcon = config.icon;
                                                        return (
                                                            <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${config.color} mb-0.5`}>
                                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                                {config.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 font-medium">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {date}
                                                </span>
                                                
                                                {testIds.length > 0 && (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <Hash className="w-3.5 h-3.5 text-slate-300" />
                                                        {testIds.map((id, idx) => (
                                                            <span key={`${ticket.id}-${idx}`} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-600 shadow-sm">
                                                                {id}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions - Stop Propagation to prevent row click */}
                                        <div className="flex-shrink-0 w-full md:w-auto flex items-center gap-2">
                                            {isOwner && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteTicket(ticket);
                                                    }}
                                                    className="w-10 h-10 md:w-auto md:h-auto md:px-3 md:py-2.5 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm group/btn"
                                                    title="Excluir Chamado"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadPdf(ticket);
                                                }}
                                                disabled={!!printingTicketId}
                                                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-wait hover:shadow-sm active:scale-95"
                                            >
                                                {printingTicketId === ticket.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <FileDown className="w-4 h-4" />
                                                )}
                                                Baixar PDF
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        })}
        
        {sortedUserKeys.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="inline-block p-4 rounded-full bg-slate-50 mb-4">
                    <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Nenhuma evidência encontrada</h3>
                <p className="text-slate-500 mt-1">Tente buscar por outro termo ou usuário.</p>
            </div>
        )}
      </div>

      {/* Hidden Print Container */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
         <div ref={printRef} className="bg-white font-inter text-slate-900 relative w-full" style={{ margin: 0, padding: 0 }}>
            {ticketToPrint && (
                <main className="w-full">
                     {/* Print Content... */}
                     {/* ... (Keep existing print template) ... */}
                     <div className="mb-0 space-y-4">
                        <div className="border-b-2 border-slate-900 pb-4 mb-6">
                            <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight leading-tight m-0 p-0">
                                {ticketToPrint.ticketInfo.ticketTitle || 'Sem Título'}
                            </h1>
                        </div>
                        {/* ... (rest of the print template omitted for brevity, keeping same logic) ... */}
                        <div className="grid grid-cols-4 gap-y-4 gap-x-6 text-left">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Chamado (ID)</label>
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.ticketId || '-'}</p>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Prioridade</label>
                                {(() => {
                                   const p = ticketToPrint.ticketInfo.priority || TicketPriority.MEDIUM;
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
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.requestDate ? ticketToPrint.ticketInfo.requestDate.split('-').reverse().join('/') : '-'}</p>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Data Evidência</label>
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.evidenceDate ? ticketToPrint.ticketInfo.evidenceDate.split('-').reverse().join('/') : '-'}</p>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Solicitante</label>
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.requester || '-'}</p>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Analista</label>
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.analyst || ticketToPrint.createdBy}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Cliente / Sistema</label>
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.clientSystem || '-'}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Ambiente</label>
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.environment || '-'}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Versão</label>
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.environmentVersion || '-'}</p>
                            </div>
                            <div className="col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Sprint</label>
                                <p className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1">{ticketToPrint.ticketInfo.sprint || '-'}</p>
                           </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição do Chamado</label>
                            <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{ticketToPrint.ticketInfo.ticketDescription || 'Nenhuma descrição fornecida.'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Solução / Correção Aplicada</label>
                            <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">{ticketToPrint.ticketInfo.solution || 'Não aplicável.'}</p>
                        </div>
                    </div>

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

                     <div className="pt-0 mt-0" style={{ pageBreakBefore: 'always', marginTop: 0 }}>
                        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-900 pb-2">
                            <ListChecks className="w-5 h-5" /> Detalhamento da Execução
                        </h2>
                        <EvidenceList 
                            evidences={ticketToPrint.items} 
                            onDelete={() => {}}
                            readOnly={true}
                        />
                     </div>
                </main>
            )}
         </div>
      </div>
    </div>
  );
};

export default EvidenceManagement;