import React, { useState, useRef, useEffect } from 'react';
import { useTicketContext } from './TicketLayout';
import TicketHistoryCarousel from '../evidence/TicketHistoryCarousel';
import { Archive, History, Monitor, CheckCircle2, XCircle, AlertCircle, Clock, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { TestStatus } from '@/types';
import { formatGherkin } from '@/utils/gherkinUtils';

const CustomStatusDropdown = ({ currentStatus, onStatusChange }: { currentStatus: TestStatus, onStatusChange: (status: TestStatus) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [
        { value: TestStatus.PENDING, label: 'Pendente', icon: Clock, colorClass: 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200', iconColor: 'text-slate-500' },
        { value: TestStatus.PASS, label: 'Sucesso', icon: CheckCircle2, colorClass: 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border-emerald-200', iconColor: 'text-emerald-600' },
        { value: TestStatus.FAIL, label: 'Falha', icon: XCircle, colorClass: 'text-red-800 bg-red-100 hover:bg-red-200 border-red-200', iconColor: 'text-red-600' },
        { value: TestStatus.BLOCKED, label: 'Impedimento', icon: AlertCircle, colorClass: 'text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-200', iconColor: 'text-amber-600' },
    ];

    const currentOption = options.find(o => o.value === currentStatus) || options[0];
    const CurrentIcon = currentOption.icon;

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${currentOption.colorClass}`}
            >
                <CurrentIcon className={`w-3.5 h-3.5 mr-1.5 ${currentOption.iconColor}`} />
                {currentOption.label}
                <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} opacity-60`} />
            </button>

            {isOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 mt-2 w-44 rounded-xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-slide-down origin-top overflow-hidden">
                    <div className="py-1">
                        {options.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStatusChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center transition-colors ${
                                        currentStatus === option.value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 mr-2.5 ${currentStatus === option.value ? 'text-indigo-500' : option.iconColor}`} />
                                    {option.label}
                                    {currentStatus === option.value && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-indigo-500" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const TicketHistoryPage: React.FC = () => {
    const { 
        evidences,
        ticketHistory, 
        isHistoryExpanded, 
        setIsHistoryExpanded,
        onOpenArchivedTicket,
        onDownloadArchivedPdf,
        setTicketToDelete,
        onEditCase,
        onEditCaseStatus
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

                    <div className="border border-slate-200 rounded-lg overflow-visible shadow-sm bg-white">
                        <div className="overflow-visible">
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
                                                    <td className="px-4 py-3 text-slate-700 whitespace-normal break-words" title={details.objective}>
                                                        {details.objective ? details.objective.replace(/^(\s*)(\*\*)?(cenário|cenario)(\*\*)?(?:\s*:\s*|\s+)/i, '').trim() : ''}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <CustomStatusDropdown 
                                                            currentStatus={item.status as TestStatus} 
                                                            onStatusChange={(newStatus) => {
                                                                if (onEditCaseStatus) onEditCaseStatus(item.id, newStatus);
                                                            }} 
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
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
                                                                    <p className="text-slate-800">{formatGherkin(details.condition)}</p>
                                                                </div>
                                                                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 shadow-sm">
                                                                    <span className="block font-bold text-indigo-900 uppercase mb-1 text-[10px]">Resultado Esperado</span>
                                                                    <p className="text-indigo-900">{formatGherkin(details.expectedResult)}</p>
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
