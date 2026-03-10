import React, { useRef } from 'react';
import { Archive, ChevronDown, ChevronLeft, ChevronRight, User as UserIcon, Layers, ListChecks, Calendar, Loader2, FileDown, Trash2 } from 'lucide-react';
import { ArchivedTicket, TicketPriority, TicketStatus } from '@/types';
import { getTicketStatusBadges } from '@/utils/ticketUtils';
import { PRIORITY_CONFIG, TICKET_STATUS_CONFIG } from '@/constants';

interface TicketHistoryCarouselProps {
    displayedHistory: ArchivedTicket[];
    isHistoryExpanded: boolean;
    setIsHistoryExpanded: (expanded: boolean) => void;
    handleOpenArchivedTicket: (ticket: ArchivedTicket) => void;
    handleDownloadArchivedPdf: (ticket: ArchivedTicket) => void;
    isGeneratingPdf: boolean;
    printingTicket: ArchivedTicket | null;
    setTicketToDelete: (ticket: ArchivedTicket) => void;
}

const TicketHistoryCarousel: React.FC<TicketHistoryCarouselProps> = ({
    displayedHistory,
    isHistoryExpanded,
    setIsHistoryExpanded,
    handleOpenArchivedTicket,
    handleDownloadArchivedPdf,
    isGeneratingPdf,
    printingTicket,
    setTicketToDelete
}) => {
    const historyCarouselRef = useRef<HTMLDivElement>(null);

    const scrollHistory = (direction: 'left' | 'right') => {
        if (historyCarouselRef.current) {
            const scrollAmount = direction === 'left' ? -350 : 350;
            historyCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!displayedHistory || displayedHistory.length === 0) return null;

    return (
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
                            const ticketStatus = ticket.ticketInfo.ticketStatus || TicketStatus.PENDING;
                            const TicketStatusConfig = TICKET_STATUS_CONFIG[ticketStatus];
                            const TicketStatusIcon = TicketStatusConfig.icon;

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
                                            <div className="flex flex-wrap gap-2 justify-start min-h-[28px] mb-2">
                                                {/* TICKET STATUS BADGE */}
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider shadow-sm ${TicketStatusConfig.color}`}>
                                                    <TicketStatusIcon className="w-3 h-3 mr-1.5" />
                                                    {TicketStatusConfig.label}
                                                </span>

                                                {/* TEST STATUSES */}
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
    );
};

export default TicketHistoryCarousel;
