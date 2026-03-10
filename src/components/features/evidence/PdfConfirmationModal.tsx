import React from 'react';
import { FileDown, Save } from 'lucide-react';

interface PdfConfirmationModalProps {
    showPdfModal: boolean;
    setShowPdfModal: (show: boolean) => void;
    isPdfMode: boolean;
    handleModalConfirm: () => void;
}

const PdfConfirmationModal: React.FC<PdfConfirmationModalProps> = ({
    showPdfModal,
    setShowPdfModal,
    isPdfMode,
    handleModalConfirm
}) => {
    if (!showPdfModal) return null;

    return (
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
    );
};

export default PdfConfirmationModal;
