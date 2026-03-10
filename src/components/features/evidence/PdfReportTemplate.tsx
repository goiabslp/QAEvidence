import React from 'react';
import { EvidenceItem, TicketInfo, ArchivedTicket, TestStatus, User, TicketPriority } from '@/types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/constants';
import { History, ListChecks } from 'lucide-react';
import EvidenceList from './EvidenceList';

interface PdfReportTemplateProps {
    reportRef: React.RefObject<HTMLDivElement>;
    printingTicket: ArchivedTicket | null;
    modalTicketInfo: TicketInfo | null;
    currentUser: User | null;
    pdfItems: EvidenceItem[];
    evidences: EvidenceItem[];
}

const PdfReportTemplate: React.FC<PdfReportTemplateProps> = ({
    reportRef,
    printingTicket,
    modalTicketInfo,
    currentUser,
    pdfItems,
    evidences
}) => {
    return (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
            <div ref={reportRef} className="bg-white font-inter text-slate-900 relative w-full" style={{ margin: 0, padding: 0 }}>
                <main className="w-full">
                    {/* SECTION: TICKET INFORMATION */}
                    <div className="mb-0 space-y-4">
                        {/* ROW 1: TITLE */}
                        <div className="border-b-2 border-slate-900 pb-4 mb-6">
                            <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight leading-tight m-0 p-0">
                                {(printingTicket ? printingTicket.ticketInfo.ticketTitle : modalTicketInfo?.ticketTitle) || 'Sem Título'}
                            </h1>
                        </div>

                        {/* GRID INFO */}
                        <div className="grid grid-cols-4 gap-y-4 gap-x-6 text-left">
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
                                        : new Date().toLocaleDateString('pt-BR')
                                    }
                                </p>
                            </div>

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
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === TestStatus.PASS ? 'bg-emerald-100 text-emerald-800' :
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
                            onDelete={() => { }}
                            readOnly={true}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PdfReportTemplate;
