import React from 'react';
import { Outlet, useLocation, useNavigate, useParams, Navigate, useOutletContext } from 'react-router-dom';
import { Info, History, Layers, Save, FileDown, X, Loader2, AlertCircle } from 'lucide-react';
import { TicketInfo, EvidenceItem, User } from '@/types';
import { WizardTriggerContext } from '@/App';

export interface TicketContextType {
    evidences: EvidenceItem[];
    users: User[];
    ticketInfo: TicketInfo | null;
    wizardTrigger: WizardTriggerContext | null;
    invalidFields: string[];
    isGeneratingPdf: boolean;
    isSaving: boolean;
    ticketHistory: any[];
    isHistoryExpanded: boolean;
    isDirty: boolean;
    pdfError: string | null;
    isSaveSuccess: boolean;
    
    // Handlers
    onTicketInfoChange: (info: TicketInfo) => void;
    onWizardSave: (items: any[]) => Promise<any>;
    onClearTrigger: () => void;
    onAddCase: (scenarioNumber: number) => void;
    onEditCase: (id: string) => void;
    onCopyCase: (id: string) => void;
    onDeleteEvidence: (id: string) => void;
    onDeleteScenario: (scenarioNumber: number) => void;
    setIsHistoryExpanded: (val: boolean) => void;
    onOpenArchivedTicket: (ticket: any) => void;
    onDownloadArchivedPdf: (ticket: any) => void;
    setTicketToDelete: (ticket: any) => void;
    formRef: any;
    onSave: () => void;
    onPdf: () => void;
    onClose: () => void;
}

export function useTicketContext() {
    return useOutletContext<TicketContextType>();
}



const TicketLayout: React.FC<{ context: TicketContextType }> = ({ context }) => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Tabs definition
    const tabs = [
        {
            path: `/${id}/informacoes`,
            label: 'Informações do Chamado',
            icon: Info
        },
        {
            path: `/${id}/cenarios`,
            label: 'Cenários',
            icon: Layers
        },
        {
            path: `/${id}/historico`,
            label: 'Histórico de Teste',
            icon: History
        }
    ];

    // Se estiver exatamente na raiz do ID, redireciona para informacoes
    if (pathname === `/${id}`) {
        return <Navigate to={`/${id}/informacoes`} replace />;
    }

    return (
        <div className="w-full flex flex-col items-center">
            {/* Header Tabs & Actions (Sticky, Glassmorphic, Modern) */}
            <div className="sticky top-0 z-40 w-full bg-slate-50/85 backdrop-blur-xl border-b border-slate-200/50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] mb-6 flex justify-center py-3 transition-all duration-300">
                <div className="w-full max-w-[96%] flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Tabs (Pill style, no wrapper bg) */}
                    <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto p-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = pathname.startsWith(tab.path);
                            return (
                                <button
                                    key={tab.path}
                                    type="button"
                                    onClick={() => navigate(tab.path)}
                                    className={`group relative flex items-center gap-2 py-2 px-4 text-sm font-bold transition-all duration-300 rounded-full overflow-hidden whitespace-nowrap ${
                                        isActive
                                            ? 'text-indigo-700 bg-indigo-100/50 shadow-sm ring-1 ring-indigo-200/50'
                                            : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/30'
                                    }`}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/20 to-transparent opacity-50"></div>
                                    )}
                                    <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="relative z-10">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Compact Actions (Premium solid colors & hover fx) */}
                    <div className="flex items-center gap-2.5 self-end md:self-auto">
                        {context.isSaveSuccess && (
                            <div className="text-emerald-600 text-xs font-bold flex items-center gap-1 animate-pulse mr-1 bg-emerald-50 px-2 py-1 rounded-md">
                                <Save className="w-3 h-3" /> Salvo
                            </div>
                        )}
                        {context.pdfError && (
                            <div className="text-rose-600 text-xs font-bold flex items-center gap-1 mr-1 bg-rose-50 px-2 py-1 rounded-md" title={context.pdfError}>
                                <AlertCircle className="w-3 h-3" /> Erro
                            </div>
                        )}
                        
                        {/* Save Button */}
                        <button
                            onClick={context.onSave}
                            disabled={context.isSaving || context.isGeneratingPdf || !context.isDirty}
                            className="group flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all duration-300 px-4 py-2 rounded-full font-bold text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95 border border-emerald-500"
                            title="Salvar Evidência"
                        >
                            {context.isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />}
                            <span className="hidden sm:inline">Salvar</span>
                        </button>

                        {/* PDF Button */}
                        <button
                            onClick={context.onPdf}
                            disabled={context.isGeneratingPdf || context.isSaving || context.evidences.length === 0}
                            className="group flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 px-4 py-2 rounded-full font-bold text-xs shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 border border-blue-500"
                            title="Baixar PDF"
                        >
                            {context.isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />}
                            <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={context.onClose}
                            disabled={context.isSaving || context.isGeneratingPdf}
                            className="group flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50 transition-all duration-300 px-4 py-2 rounded-full font-bold text-xs border border-rose-100 hover:border-rose-200 active:scale-95 shadow-sm"
                            title="Fechar Chamado"
                        >
                            <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                            <span className="hidden sm:inline">Fechar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="w-full max-w-[96%] pb-10">
                <Outlet context={context} />
            </div>
        </div>
    );
};

export default TicketLayout;
