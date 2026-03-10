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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setTicketToDelete(null)}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
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
    );
};

export default DeleteTicketModal;
