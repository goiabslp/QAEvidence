import React from 'react';
import { Outlet, useLocation, useNavigate, useParams, Navigate, useOutletContext } from 'react-router-dom';
import { Info, History, Layers, Save, FileDown, X, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
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
    onWizardSave: (items: any[], isAutoSave?: boolean) => Promise<any>;
    onClearTrigger: () => void;
    onAddCase: (scenarioNumber: number) => void;
    onEditCase: (id: string) => void;
    onCopyCase: (id: string) => void;
    onDeleteEvidence: (id: string) => void;
    onDeleteScenario: (scenarioNumber: number) => void;
    onEditScenarioTitle: (scenarioNumber: number, newTitle: string) => void;
    onEditCaseStatus: (id: string, newStatus: string) => void;
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

    const currentIndex = tabs.findIndex(tab => pathname.startsWith(tab.path));
    const nextTab = currentIndex >= 0 && currentIndex < tabs.length - 1 ? tabs[currentIndex + 1] : null;
    const prevTab = currentIndex > 0 ? tabs[currentIndex - 1] : null;

    return (
        <div className="w-full flex flex-col items-center">
            {/* Header Tabs & Actions (Sticky, Glassmorphic, Modern) */}
            <div className="sticky top-0 z-40 w-full bg-slate-50/85 backdrop-blur-xl border-b border-slate-200/50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] mb-6 flex flex-col items-center py-2 transition-all duration-300">
                <div className="w-full max-w-[96%]">
                    {/* Título do Chamado Fixo */}
                    {context.ticketInfo?.ticketTitle && (
                        <div className="w-full pb-2 mb-2 border-b border-slate-200/50 flex items-center gap-2 animate-fade-in">
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                CHAMADO
                            </span>
                            <h1 className="text-slate-700 font-bold text-sm truncate" title={context.ticketInfo.ticketTitle}>
                                {context.ticketInfo.ticketTitle}
                            </h1>
                        </div>
                    )}
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-2 sm:gap-4">
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
                                    className={`group relative flex items-center gap-2 py-2 px-4 text-xs tracking-wider uppercase font-black transition-all duration-300 rounded-full overflow-hidden whitespace-nowrap ${
                                        isActive
                                            ? 'text-indigo-800 bg-indigo-100/60 shadow-sm ring-1 ring-indigo-200/60'
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
        </div>

            {/* Content Area */}
            <div className="w-full max-w-[96%] pb-10">
                <Outlet context={context} />
                
                {/* Botões de Navegação */}
                <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-200/60">
                    {prevTab ? (
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                navigate(prevTab.path);
                            }}
                            className="group flex items-center gap-2 px-6 py-3 bg-white text-slate-600 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95 border border-slate-200 hover:border-indigo-200"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Voltar para {prevTab.label}
                        </button>
                    ) : (
                        <div></div>
                    )}

                    {nextTab && (
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                navigate(nextTab.path);
                            }}
                            className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-95 border border-indigo-500"
                        >
                            Avançar para {nextTab.label}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketLayout;
