import React from 'react';
import { Trash2, X } from 'lucide-react';
import { ArchivedTicket } from '@/types';

interface DeleteTicketModalProps {
    ticketToDelete: ArchivedTicket | null;
    setTicketToDelete: (ticket: ArchivedTicket | null) => void;
    handleConfirmDelete: () => void;
}

const DeleteTicketModal: React.FC<DeleteTicketModalProps> = ({
    ticketToDelete,
    setTicketToDelete,
    handleConfirmDelete
}) => {
    if (!ticketToDelete) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
            onClick={() => setTicketToDelete(null)}
        >
            <div
                className="bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-md overflow-hidden animate-zoom-in border border-slate-200/60 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative Top Border */}
                <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-600 absolute top-0 left-0"></div>

                <div className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer p-2 hover:bg-slate-100 rounded-full transition-all" onClick={() => setTicketToDelete(null)}>
                    <X className="w-5 h-5" />
                </div>

                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-400 rounded-2xl animate-ping opacity-20"></div>
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 relative shadow-inner">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Excluir Evidência</h3>
                            <p className="text-sm font-bold text-red-500 mt-0.5">Ação Irreversível</p>
                        </div>
                    </div>

                    <p className="text-slate-600 mb-6 leading-relaxed font-medium">
                        Você está prestes a remover permanentemente esta evidência e todos os seus testes vinculados. Tem certeza que deseja prosseguir?
                    </p>

                    <div className="w-full bg-slate-50/80 rounded-2xl p-5 mb-8 border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-4">
                            <div>
                                <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-widest mb-1.5">ID do Chamado</span>
                                <span className="font-bold text-slate-800 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 inline-block shadow-sm">
                                    {ticketToDelete.ticketInfo.ticketId || 'DRAFT'}
                                </span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-widest mb-1.5">Título</span>
                                <span className="font-semibold text-slate-700 text-sm block leading-snug bg-white px-3 py-2.5 rounded-lg border border-slate-200 shadow-sm">
                                    {ticketToDelete.ticketInfo.ticketTitle || 'Sem título'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => setTicketToDelete(null)}
                            className="flex-1 px-5 py-3.5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            className="flex-1 px-5 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/40 transition-all active:scale-95 border border-red-500"
                        >
                            Sim, excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteTicketModal;
