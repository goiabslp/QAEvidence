import React, { useMemo, useState } from 'react';
import { ArchivedTicket, User, TicketStatus, TicketPriority } from '@/types';
import { TICKET_STATUS_CONFIG, PRIORITY_CONFIG } from '@/constants';
import {
    Search,
    FileDown,
    ArrowRight,
    Trash2,
    Calendar,
    Hash,
    FileText,
    Clock,
    Loader2,
    ChevronRight,
    User as UserIcon,
    Tag
} from 'lucide-react';

interface UserEvidenceListProps {
    tickets: ArchivedTicket[];
    currentUser: User;
    onOpenTicket: (ticket: ArchivedTicket) => void;
    onDownloadPdf: (ticket: ArchivedTicket) => void;
    onDeleteTicket: (ticketId: string) => void;
    isGeneratingPdf: boolean;
    printingTicketId: string | null;
}

const UserEvidenceList: React.FC<UserEvidenceListProps> = ({
    tickets,
    currentUser,
    onOpenTicket,
    onDownloadPdf,
    onDeleteTicket,
    isGeneratingPdf,
    printingTicketId
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter only current user tickets and search term
    const filteredTickets = useMemo(() => {
        console.log("Filtering tickets for user:", currentUser.acronym);
        console.log("Total tickets to filter:", tickets.length);
        const filtered = tickets
            .filter(t => {
                const term = searchTerm.toLowerCase();
                const ticketId = (t.ticketInfo.ticketId || '').toLowerCase();
                const ticketTitle = (t.ticketInfo.ticketTitle || '').toLowerCase();
                const sprint = (t.ticketInfo.sprint || '').toLowerCase();
                
                return (
                    ticketId.includes(term) ||
                    ticketTitle.includes(term) ||
                    sprint.includes(term)
                );
            })
            .sort((a, b) => (Number(b.archivedAt) || 0) - (Number(a.archivedAt) || 0));
        
        console.log("Filtered tickets count (no user filter):", filtered.length);
        return filtered;
    }, [tickets, currentUser.acronym, searchTerm]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Search */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-indigo-600" />
                            Minhas Evidências
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Gerencie seu histórico pessoal de testes e evidências.</p>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por ID, Título ou Sprint..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                        />
                    </div>
                </div>
            </div>

            {/* Grid of Tickets */}
            <div className="grid grid-cols-1 gap-4">
                {filteredTickets.map((ticket) => {
                    const status = ticket.ticketInfo.ticketStatus || TicketStatus.PENDING;
                    const statusConfig = TICKET_STATUS_CONFIG[status];
                    const StatusIcon = statusConfig.icon;
                    const priority = ticket.ticketInfo.priority || TicketPriority.MEDIUM;
                    const priorityConfig = PRIORITY_CONFIG[priority];

                    const formattedDate = ticket.ticketInfo.evidenceDate
                        ? ticket.ticketInfo.evidenceDate.split('-').reverse().join('/')
                        : new Date(ticket.archivedAt).toLocaleDateString('pt-BR');

                    return (
                        <div
                            key={ticket.id}
                            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-6">
                                {/* Main Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 uppercase tracking-wider">
                                            <Hash className="w-3 h-3" /> {ticket.ticketInfo.ticketId}
                                        </span>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider shadow-sm ${statusConfig.color}`}>
                                            <StatusIcon className="w-3 h-3 mr-1.5" /> {statusConfig.label}
                                        </span>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${priorityConfig.color}`}>
                                            {priorityConfig.label}
                                        </span>
                                        {ticket.ticketInfo.sprint && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                Sprint {ticket.ticketInfo.sprint}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-2 truncate">
                                        {ticket.ticketInfo.ticketTitle}
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-slate-400" /> {formattedDate}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <UserIcon className="w-4 h-4 text-slate-400" /> {currentUser.name} ({currentUser.acronym})
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Tag className="w-4 h-4 text-slate-400" /> {ticket.items.length} Casos
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                                    <button
                                        onClick={() => onOpenTicket(ticket)}
                                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-sm font-bold transition-all"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        Visualizar
                                    </button>
                                    <button
                                        onClick={() => onDownloadPdf(ticket)}
                                        disabled={isGeneratingPdf || printingTicketId === ticket.id}
                                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                    >
                                        {printingTicketId === ticket.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <FileDown className="w-4 h-4" />
                                        )}
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => onDeleteTicket(ticket.id)}
                                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-bold transition-all"
                                        title="Excluir Evidência"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredTickets.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="inline-block p-4 rounded-full bg-slate-50 mb-4 text-slate-300">
                            <FileText className="w-12 h-12" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Nenhuma evidência encontrada</h3>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                            Você ainda não salvou nenhuma evidência ou sua busca não retornou resultados.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserEvidenceList;
