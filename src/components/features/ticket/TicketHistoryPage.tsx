import React, { useState } from 'react';
import { useTicketContext } from './TicketLayout';
import TicketHistoryCarousel from '../evidence/TicketHistoryCarousel';
import { Archive, History, Monitor, CheckCircle2, XCircle, AlertCircle, Clock, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { TestStatus } from '@/types';

const TicketHistoryPage: React.FC = () => {
    const { 
        evidences,
        ticketHistory, 
        isHistoryExpanded, 
        setIsHistoryExpanded,
        onOpenArchivedTicket,
        onDownloadArchivedPdf,
        setTicketToDelete,
        onEditCase
    } = useTicketContext();

    const [expandedHistoryRows, setExpandedHistoryRows] = useState<Set<string>>(new Set());

    const toggleHistoryRow = (id: string) => {
        const newSet = new Set(expandedHistoryRows);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedHistoryRows(newSet);
    };

    const historyItems = evidences
        .filter(ev => ev.testCaseDetails)
        .sort((a, b) => {
            const detailsA = a.testCaseDetails!;
            const detailsB = b.testCaseDetails!;
            if (detailsA.scenarioNumber !== detailsB.scenarioNumber) {
                return detailsA.scenarioNumber - detailsB.scenarioNumber;
            }
            return detailsA.caseNumber - detailsB.caseNumber;
        });

    return (
        <div className="space-y-8 bg-transparent">
            {/* Histórico do Chamado Atual */}
            {historyItems.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 pb-4">
                        <div className="p-1.5 bg-slate-100 rounded-md">
                            <History className="w-4 h-4 text-slate-600" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            Histórico de Teste Atual
                        </h3>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-10">#</th>
                                        <th className="px-4 py-3">Código ID</th>
                                        <th className="px-4 py-3">Tela</th>
                                        <th className="px-4 py-3 w-1/3">Funcionalidade</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right w-24"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historyItems.map((item) => {
                                        const details = item.testCaseDetails!;
                                        const isExpanded = expandedHistoryRows.has(item.id);

                                        return (
                                            <React.Fragment key={item.id}>
                                                <tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`} onClick={() => toggleHistoryRow(item.id)}>
                                                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{details.scenarioNumber}.{details.caseNumber}</td>
                                                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-600">{details.caseId}</td>
                                                    <td className="px-4 py-3 text-slate-800 flex items-center gap-2">
                                                        <Monitor className="w-3 h-3 text-slate-400" />
                                                        {details.screen}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700 truncate max-w-xs" title={details.objective}>
                                                        {details.objective}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${item.status === TestStatus.PASS ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                            item.status === TestStatus.FAIL ? 'bg-red-100 text-red-800 border border-red-200' :
                                                                item.status === TestStatus.BLOCKED ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                                    item.status === TestStatus.PENDING ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                                                        item.status === TestStatus.SKIPPED ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                                                                            'bg-slate-100 text-slate-800 border border-slate-200'
                                                            }`}>
                                                            {item.status === TestStatus.PASS && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                            {item.status === TestStatus.FAIL && <XCircle className="w-3 h-3 mr-1" />}
                                                            {item.status === TestStatus.BLOCKED && <AlertCircle className="w-3 h-3 mr-1" />}
                                                            {item.status === TestStatus.SKIPPED && <Clock className="w-3 h-3 mr-1" />}
                                                            {item.status === TestStatus.PENDING && <Clock className="w-3 h-3 mr-1" />}

                                                            {item.status === TestStatus.PASS ? 'Sucesso' :
                                                                item.status === TestStatus.FAIL ? 'Falha' :
                                                                    item.status === TestStatus.BLOCKED ? 'Impedimento' :
                                                                        item.status === TestStatus.SKIPPED ? 'Pendente' :
                                                                            item.status === TestStatus.PENDING ? 'Pendente' :
                                                                                'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                        {onEditCase && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); onEditCase(item.id); }}
                                                                className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-slate-100 rounded transition-colors"
                                                                title="Editar Caso"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button type="button" className="text-slate-400 hover:text-indigo-600">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/50 shadow-inner">
                                                        <td colSpan={6} className="px-4 py-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs px-2">
                                                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                                    <span className="block font-bold text-indigo-900 uppercase mb-1 text-[10px]">Pré-Requisito</span>
                                                                    <p className="text-slate-800">{details.preRequisite || 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                                    <span className="block font-bold text-indigo-900 uppercase mb-1 text-[10px]">Descrição do Teste</span>
                                                                    <p className="text-slate-800">{details.condition || 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 shadow-sm">
                                                                    <span className="block font-bold text-indigo-900 uppercase mb-1 text-[10px]">Resultado Esperado</span>
                                                                    <p className="text-indigo-900">{details.expectedResult || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <History className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhum Cenário de Teste</h3>
                    <p className="text-slate-500 max-w-md">
                        Ainda não existem cenários e casos criados para este chamado. Quando forem criados, eles serão exibidos aqui.
                    </p>
                </div>
            )}


        </div>
    );
};

export default TicketHistoryPage;
