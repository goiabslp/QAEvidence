
import React, { useState, useMemo, useRef } from 'react';
import { ArchivedTicket, User, EvidenceItem, TestStatus } from '../types';
import { STATUS_CONFIG } from '../constants';
import { Search, FileDown, ChevronDown, ChevronRight, Calendar, Hash, FileText, Loader2, FolderOpen, Trash2, ListChecks, ClipboardCheck, ShieldCheck } from 'lucide-react';
import EvidenceForm from './EvidenceForm';
import EvidenceList from './EvidenceList';

declare const html2pdf: any;

interface EvidenceManagementProps {
  tickets: ArchivedTicket[];
  users: User[];
  onDeleteTicket: (ticket: ArchivedTicket) => void;
}

const EvidenceManagement: React.FC<EvidenceManagementProps> = ({ tickets, users, onDeleteTicket }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [printingTicketId, setPrintingTicketId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleUser = (acronym: string) => {
    const newSet = new Set(expandedUsers);
    if (newSet.has(acronym)) newSet.delete(acronym);
    else newSet.add(acronym);
    setExpandedUsers(newSet);
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

      return userName.includes(lowerSearch) || 
             userAcronym.includes(lowerSearch) ||
             title.includes(lowerSearch) ||
             date.includes(lowerSearch) ||
             testIds.includes(lowerSearch);
    });
  }, [tickets, users, searchTerm]);

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
            const opt = {
                margin: [25, 10, 25, 10], // Increased margins: Top 25mm, Bottom 25mm
                filename: `${safeFilename}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            html2pdf().set(opt).from(printRef.current).toPdf().get('pdf').then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                for (let i = 1; i <= totalPages; i++) {
                     pdf.setPage(i);
                     
                     // --- HEADER ---
                     // Left: Logo Placeholder
                     pdf.setFillColor(30, 41, 59); // slate-900
                     pdf.rect(10, 6, 12, 12, 'F');
                     pdf.setTextColor(255, 255, 255);
                     pdf.setFontSize(12);
                     pdf.setFont("helvetica", "bold");
                     pdf.text("QA", 11.5, 14);

                     // Left: Title
                     pdf.setTextColor(15, 23, 42); // slate-900
                     pdf.setFontSize(14);
                     pdf.text("RELATÓRIO DE EVIDÊNCIAS", 26, 11);
                     pdf.setFontSize(9);
                     pdf.setTextColor(100, 116, 139); // slate-500
                     pdf.setFont("helvetica", "normal");
                     pdf.text("CONTROLE DE QUALIDADE • HISTÓRICO", 26, 16);

                     // Right: Info
                     pdf.setFontSize(8);
                     pdf.setTextColor(100, 116, 139);
                     pdf.text("IDENTIFICAÇÃO", pageWidth - 10, 10, { align: 'right' });
                     pdf.setFontSize(11);
                     pdf.setTextColor(15, 23, 42); // slate-900
                     pdf.setFont("helvetica", "bold");
                     // Truncate if too long?
                     const idText = ticket.ticketInfo.ticketId || "N/A";
                     pdf.text(idText, pageWidth - 10, 15, { align: 'right' });

                     // Line
                     pdf.setDrawColor(15, 23, 42);
                     pdf.setLineWidth(0.5);
                     pdf.line(10, 22, pageWidth - 10, 22);

                     // --- FOOTER ---
                     pdf.line(10, pageHeight - 20, pageWidth - 10, pageHeight - 20);

                     // Left: Institutional
                     pdf.setFontSize(8);
                     pdf.setTextColor(100, 116, 139);
                     pdf.setFont("helvetica", "normal");
                     pdf.text("Confidencial - Uso Interno", 10, pageHeight - 12);
                     pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 10, pageHeight - 8);

                     // Right: Logo/Text
                     pdf.setFontSize(12);
                     pdf.setTextColor(15, 23, 42);
                     pdf.setFont("helvetica", "bold");
                     pdf.text("Narnia QA", pageWidth - 10, pageHeight - 11, { align: 'right' });
                     
                     // Page Num
                     pdf.setFontSize(8);
                     pdf.setTextColor(148, 163, 184); // slate-400
                     pdf.setFont("helvetica", "normal");
                     pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 10, pageHeight - 7, { align: 'right' });
                }
            }).save().then(() => {
                setPrintingTicketId(null);
            });
        }
    }, 800);
  };

  const getAggregateStatus = (items: EvidenceItem[]) => {
    const hasFailure = items.some(i => i.status === TestStatus.FAIL);
    const hasBlocker = items.some(i => i.status === TestStatus.BLOCKED);
    const hasPending = items.some(i => i.status === TestStatus.PENDING || i.status === TestStatus.SKIPPED);
    
    if (hasFailure) return STATUS_CONFIG[TestStatus.FAIL];
    if (hasBlocker) return STATUS_CONFIG[TestStatus.BLOCKED];
    if (hasPending) return STATUS_CONFIG[TestStatus.SKIPPED]; 
    return STATUS_CONFIG[TestStatus.PASS];
  };

  const ticketToPrint = tickets.find(t => t.id === printingTicketId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-indigo-600" />
                    Gestão de Evidências
                </h2>
                <p className="text-sm text-slate-500 mt-1">Visualize e exporte evidências organizadas por usuário.</p>
            </div>
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por Sigla, Nome, Título, ID..."
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                />
            </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {sortedUserKeys.map(acronym => {
            const userTickets = groupedTickets[acronym];
            const user = users.find(u => u.acronym === acronym);
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
                                    {userTickets.length} evidências registradas
                                </span>
                            </div>
                        </div>
                        <div className={`p-2 rounded-full bg-slate-100 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-100 text-indigo-600' : ''}`}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>

                    {(isExpanded || searchTerm) && (
                        <div className="divide-y divide-slate-100 bg-white">
                            {userTickets.map(ticket => {
                                const testIds = ticket.items.map(i => i.testCaseDetails?.caseId).filter(Boolean);
                                const date = ticket.ticketInfo.evidenceDate 
                                    ? ticket.ticketInfo.evidenceDate.split('-').reverse().join('/') 
                                    : new Date(ticket.archivedAt).toLocaleDateString('pt-BR');
                                
                                const statusConfig = getAggregateStatus(ticket.items);
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <div key={ticket.id} className="p-5 flex flex-col md:flex-row items-center gap-5 hover:bg-slate-50/80 transition-colors group">
                                        {/* Icon */}
                                        <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all">
                                            <FileText className="w-5 h-5" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 w-full">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="font-bold text-slate-800 text-base group-hover:text-indigo-700 transition-colors">
                                                    {ticket.ticketInfo.ticketTitle}
                                                </h4>
                                                <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.color}`}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {statusConfig.label}
                                                </span>
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

                                        {/* Actions */}
                                        <div className="flex-shrink-0 w-full md:w-auto flex items-center gap-2">
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

                                            <button 
                                                onClick={() => handleDownloadPdf(ticket)}
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

      {/* Hidden Print Container - REFACTORED FOR HEADER/CONTENT/FOOTER */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1200px' }}>
         <div ref={printRef} className="bg-white p-8 font-inter text-slate-900 relative">
            {ticketToPrint && (
                <>
                    {/* Header Removed - Injected via PDF */}

                    {/* Middle Section */}
                    <main className="flex-grow">
                         {/* Ticket Data */}
                         <div className="mb-8 p-6 border-l-4 border-slate-900 bg-slate-50 rounded-r-lg">
                             <h3 className="text-xl font-bold text-slate-900 mb-4 leading-tight">{ticketToPrint.ticketInfo.ticketTitle}</h3>
                             <div className="grid grid-cols-4 gap-6 text-sm">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Solicitante</span>
                                    <span className="font-bold text-slate-900">{ticketToPrint.ticketInfo.requester || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Analista</span>
                                    <span className="font-bold text-slate-900">{ticketToPrint.ticketInfo.analyst || ticketToPrint.createdBy}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Data Original</span>
                                    <span className="font-bold text-slate-900">{ticketToPrint.ticketInfo.evidenceDate ? ticketToPrint.ticketInfo.evidenceDate.split('-').reverse().join('/') : '-'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Sistema</span>
                                    <span className="font-bold text-slate-900">{ticketToPrint.ticketInfo.clientSystem || '-'}</span>
                                </div>
                             </div>
                         </div>

                         {/* Evidence List */}
                         <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                                <ListChecks className="w-6 h-6 text-slate-900" />
                                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Detalhamento da Execução</h3>
                            </div>
                            <EvidenceList 
                                evidences={ticketToPrint.items} 
                                onDelete={() => {}}
                            />
                         </div>
                    </main>

                    {/* Footer Removed - Injected via PDF */}
                </>
            )}
         </div>
      </div>
    </div>
  );
};

export default EvidenceManagement;
