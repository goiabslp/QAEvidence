import React, { useMemo } from 'react';
import { ExcelTestRecord } from '../../../types';
import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, CircleDashed } from 'lucide-react';

interface DashboardTabProps {
    testRecords: ExcelTestRecord[];
}

const DashboardTab: React.FC<DashboardTabProps> = ({ testRecords }) => {
    
    const stats = useMemo(() => {
        const total = testRecords.length;
        const success = testRecords.filter(t => t.result === 'Sucesso').length;
        const pending = testRecords.filter(t => t.result === 'Pendente').length;
        const inProgress = testRecords.filter(t => t.result === 'Em Andamento').length;
        const error = testRecords.filter(t => t.result === 'Erro').length;
        const blocked = testRecords.filter(t => t.result === 'Impedimento').length;

        // By Analyst
        const byAnalyst = testRecords.reduce((acc, curr) => {
            const analyst = curr.analyst || 'Não Atribuído';
            if (!acc[analyst]) {
                acc[analyst] = { total: 0, completed: 0, pending: 0, inProgress: 0 };
            }
            acc[analyst].total += 1;
            if (curr.result === 'Sucesso') acc[analyst].completed += 1;
            else if (curr.result === 'Em Andamento') acc[analyst].inProgress += 1;
            else acc[analyst].pending += 1;
            return acc;
        }, {} as Record<string, { total: number, completed: number, pending: number, inProgress: number }>);

        // By Module
        const byModule = testRecords.reduce((acc, curr) => {
            const mod = curr.module || 'Sem Módulo';
            if (!acc[mod]) {
                acc[mod] = { total: 0, completed: 0, pending: 0 };
            }
            acc[mod].total += 1;
            if (curr.result === 'Sucesso') acc[mod].completed += 1;
            else acc[mod].pending += 1;
            return acc;
        }, {} as Record<string, { total: number, completed: number, pending: number }>);

        // By Use Case
        const byUseCase = testRecords.reduce((acc, curr) => {
            const uc = curr.useCase || 'Sem Use Case';
            if (!acc[uc]) {
                acc[uc] = { total: 0, completed: 0, pending: 0 };
            }
            acc[uc].total += 1;
            if (curr.result === 'Sucesso') acc[uc].completed += 1;
            else acc[uc].pending += 1;
            return acc;
        }, {} as Record<string, { total: number, completed: number, pending: number }>);

        return { total, success, pending, inProgress, error, blocked, byAnalyst, byModule, byUseCase };
    }, [testRecords]);

    const globalPercentage = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Global KPIS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</p>
                    <p className="text-3xl font-black text-slate-800">{stats.total}</p>
                </div>
                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm text-center">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Concluídos</p>
                    <p className="text-3xl font-black text-emerald-700">{stats.success}</p>
                </div>
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm text-center">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Em Andamento</p>
                    <p className="text-3xl font-black text-blue-700">{stats.inProgress}</p>
                </div>
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pendentes</p>
                    <p className="text-3xl font-black text-slate-700">{stats.pending}</p>
                </div>
                <div className="relative p-5 bg-indigo-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-md overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Progresso</p>
                    <p className="text-3xl font-black">{globalPercentage}%</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Diagnóstico por Analista */}
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                        </div>
                        Diagnóstico por Analista
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {(Object.entries(stats.byAnalyst) as [string, any][])
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([analyst, data]) => (
                            <div key={analyst} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-sm text-slate-700 group-hover:text-indigo-700 transition-colors">{analyst}</h4>
                                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full shadow-sm">{data.total} testes</span>
                                </div>
                                <div className="flex gap-4 mt-2">
                                    <div className="flex items-center gap-1.5 min-w-[30%]">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-xs font-bold text-slate-600">{data.completed}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-[30%]">
                                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-xs font-bold text-slate-600">{data.inProgress}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-[30%]">
                                        <CircleDashed className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">{data.pending}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Diagnóstico por Módulo */}
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                        </div>
                        Diagnóstico por Módulo
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {(Object.entries(stats.byModule) as [string, any][])
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([mod, data]) => {
                            const pct = Math.round((data.completed / data.total) * 100);
                            return (
                                <div key={mod} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-sm text-slate-700 group-hover:text-indigo-700 transition-colors">{mod}</h4>
                                        <span className="text-xs font-bold text-slate-500">{data.completed} / {data.total} ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1 overflow-hidden">
                                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Diagnóstico por Use Case */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                    </div>
                    Diagnóstico por Use Case
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-80 overflow-y-auto pr-2">
                    {(Object.entries(stats.byUseCase) as [string, any][])
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([uc, data]) => {
                            const pct = Math.round((data.completed / data.total) * 100);
                            return (
                                <div key={uc} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-sm text-slate-700 line-clamp-1 group-hover:text-indigo-700 transition-colors" title={uc}>{uc}</h4>
                                    </div>
                                    <div className="flex justify-between items-center mb-1 text-xs text-slate-500 font-medium">
                                        <span>{pct}% Concluído</span>
                                        <span>{data.completed}/{data.total}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            )
                    })}
                </div>
            </div>
        </div>
    );
};

export default DashboardTab;
