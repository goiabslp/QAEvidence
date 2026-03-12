import React, { useState, useMemo } from 'react';
import { ExcelTestRecord, User } from '../../../types';
import { 
    LayoutDashboard, CheckCircle2, Clock, AlertCircle, CircleDashed, 
    User as UserIcon, AlertTriangle, Layers, Target, CheckCheck, 
    XCircle, Timer, BarChart3, PieChart, Activity 
} from 'lucide-react';
import ModernSelect from '../../common/ModernSelect';

interface DashboardTabProps {
    testRecords: ExcelTestRecord[];
    allUsers: User[];
    allRecords: ExcelTestRecord[];
}

type SubTabType = 'Analista' | 'Prioridade' | 'Módulos' | 'Mínimos' | 'Backoffice';

const DashboardTab: React.FC<DashboardTabProps> = ({ testRecords, allUsers, allRecords }) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTabType>('Analista');
    const [selectedAnalyst, setSelectedAnalyst] = useState<string>('');

    // --- ANALYST OPTIONS ---
    const availableAnalysts = useMemo(() => {
        // Return active users as analysts, sorted by acronym
        return allUsers
            .filter(u => u.isActive !== false)
            .map(u => u.acronym)
            .sort();
    }, [allUsers]);

    // Auto-select first analyst if none selected
    React.useEffect(() => {
        if (!selectedAnalyst && availableAnalysts.length > 0) {
            setSelectedAnalyst(availableAnalysts[0]);
        }
    }, [availableAnalysts, selectedAnalyst]);

    // --- METRICS CALCULATION ---
    const stats = useMemo(() => {
        const total = testRecords.filter(t => t.module !== 'SYSTEM_SETTINGS').length;
        
        // Filter mappings for statuses based on user request
        const isSuccess = (r: string) => r === 'Sucesso';
        const isPending = (r: string) => r === 'Pendente';
        const isInProgress = (r: string) => r === 'Em Andamento';
        const isError = (r: string) => r === 'Erro';
        const isBlocked = (r: string) => r === 'Impedimento';

        // 1. ANALYST DATA
        const analystRecords = testRecords.filter(t => t.analyst === selectedAnalyst && t.module !== 'SYSTEM_SETTINGS');
        const analystMetrics = {
            total: analystRecords.length,
            pending: analystRecords.filter(t => isPending(t.result)).length,
            inProgress: analystRecords.filter(t => isInProgress(t.result)).length,
            error: analystRecords.filter(t => isError(t.result)).length,
            blocked: analystRecords.filter(t => isBlocked(t.result)).length,
            success: analystRecords.filter(t => isSuccess(t.result)).length,
            byModule: analystRecords.reduce((acc, curr) => {
                const m = curr.module || 'Sem Módulo';
                acc[m] = (acc[m] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            byPriority: analystRecords.reduce((acc, curr) => {
                const p = curr.priority || 'Sem Prioridade';
                acc[p] = (acc[p] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            byMinimum: analystRecords.reduce((acc, curr) => {
                const m = curr.minimum || 'Não';
                acc[m] = (acc[m] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            byBackoffice: analystRecords.reduce((acc, curr) => {
                const b = curr.backoffice || 'N/A';
                acc[b] = (acc[b] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            currentTests: analystRecords.filter(t => !isSuccess(t.result)).map(t => ({
                id: t.testId,
                module: t.module,
                status: t.result
            }))
        };

        // 2. PRIORITY DATA
        const priorityLevels = ['Alta', 'Média', 'Baixa'];
        const priorityMetrics = priorityLevels.map(p => {
            const records = testRecords.filter(t => t.priority === p && t.module !== 'SYSTEM_SETTINGS');
            return {
                level: p,
                total: records.length,
                success: records.filter(t => isSuccess(t.result)).length,
                inProgress: records.filter(t => isInProgress(t.result)).length,
                error: records.filter(t => isError(t.result)).length,
                blocked: records.filter(t => isBlocked(t.result)).length,
                pending: records.filter(t => isPending(t.result)).length
            };
        });

        // 3. MODULE DATA
        const modules = Array.from(new Set(testRecords.filter(t => t.module && t.module !== 'SYSTEM_SETTINGS').map(t => t.module))).sort();
        const moduleMetrics = modules.map(m => {
            const records = testRecords.filter(t => t.module === m);
            const totalM = records.length;
            const successM = records.filter(t => isSuccess(t.result)).length;
            return {
                name: m,
                total: totalM,
                success: successM,
                inProgress: records.filter(t => isInProgress(t.result)).length,
                pending: records.filter(t => isPending(t.result)).length,
                error: records.filter(t => isError(t.result)).length,
                blocked: records.filter(t => isBlocked(t.result)).length,
                progress: totalM > 0 ? Math.round((successM / totalM) * 100) : 0
            };
        });

        // 4. MINIMUMS DATA - Uses UNFILTERED records for global view
        const globalRecords = allRecords.filter(t => t.module !== 'SYSTEM_SETTINGS');
        const minimumsRecords = globalRecords.filter(t => String(t.minimum).trim() === 'Sim');
        const minTotal = minimumsRecords.length;
        const minSuccess = minimumsRecords.filter(t => isSuccess(t.result)).length;

        // Group minimums by backoffice
        const minBackoffices = Array.from(new Set(minimumsRecords.map(t => t.backoffice))).sort();
        const minimumsByBackoffice = minBackoffices.map(bo => {
            const boMins = minimumsRecords.filter(t => t.backoffice === bo);
            const boTotal = boMins.length;
            const boSuccess = boMins.filter(t => isSuccess(t.result)).length;
            return {
                name: bo,
                total: boTotal,
                success: boSuccess,
                inProgress: boMins.filter(t => isInProgress(t.result)).length,
                pending: boMins.filter(t => isPending(t.result)).length,
                remaining: boTotal - boSuccess,
                progress: boTotal > 0 ? Math.round((boSuccess / boTotal) * 100) : 0
            };
        });

        const minimumsMetrics = {
            total: minTotal,
            success: minSuccess,
            inProgress: minimumsRecords.filter(t => isInProgress(t.result)).length,
            pending: minimumsRecords.filter(t => isPending(t.result)).length,
            remaining: minTotal - minSuccess,
            byModule: modules.map(m => {
                const mRecords = minimumsRecords.filter(t => t.module === m);
                const mT = mRecords.length;
                const mS = mRecords.filter(t => isSuccess(t.result)).length;
                return {
                    name: m,
                    total: mT,
                    success: mS,
                    progress: mT > 0 ? Math.round((mS / mT) * 100) : 0
                };
            }).filter(m => m.total > 0),
            byBackoffice: minimumsByBackoffice
        };

        // 5. BACKOFFICE DATA
        const backoffices = Array.from(new Set(testRecords.filter(t => t.backoffice && t.module !== 'SYSTEM_SETTINGS').map(t => t.backoffice))).sort();
        const backofficeMetrics = backoffices.map(bo => {
            const boRecords = testRecords.filter(t => t.backoffice === bo);
            const boTotal = boRecords.length;
            const boSuccess = boRecords.filter(t => isSuccess(t.result)).length;
            
            // Per-module breakdown within backoffice
            const boModules = Array.from(new Set(boRecords.map(t => t.module))).sort();
            const boModuleMetrics = boModules.map(m => {
                const mRecords = boRecords.filter(t => t.module === m);
                const mT = mRecords.length;
                const mS = mRecords.filter(t => isSuccess(t.result)).length;
                return {
                    name: m,
                    total: mT,
                    success: mS,
                    inProgress: mRecords.filter(t => isInProgress(t.result)).length,
                    pending: mRecords.filter(t => isPending(t.result)).length,
                    error: mRecords.filter(t => isError(t.result)).length,
                    blocked: mRecords.filter(t => isBlocked(t.result)).length,
                    progress: mT > 0 ? Math.round((mS / mT) * 100) : 0
                };
            });

            return {
                name: bo,
                total: boTotal,
                success: boSuccess,
                inProgress: boRecords.filter(t => isInProgress(t.result)).length,
                pending: boRecords.filter(t => isPending(t.result)).length,
                error: boRecords.filter(t => isError(t.result)).length,
                blocked: boRecords.filter(t => isBlocked(t.result)).length,
                progress: boTotal > 0 ? Math.round((boSuccess / boTotal) * 100) : 0,
                byModule: boModuleMetrics
            };
        });

        return { total, analystMetrics, priorityMetrics, moduleMetrics, minimumsMetrics, backofficeMetrics };
    }, [testRecords, allRecords, selectedAnalyst]);

    // UI Helper Components
    const StatCard = ({ label, value, icon: Icon, color, subValue }: { label: string, value: number | string, icon: any, color: string, subValue?: string }) => (
        <div className={`bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all border-b-4 hover:border-b-${color === 'text-slate' ? 'slate' : color.split('-')[1]}-500`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-${color === 'text-slate' ? 'slate' : color.split('-')[1]}-50 text-${color === 'text-slate' ? 'slate' : color.split('-')[1]}-600 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
                {subValue && <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">{subValue}</span>}
            </div>
            <span className="text-4xl font-black text-slate-800 leading-none mb-2">{value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
    );

    const ProgressItem = ({ label, value, total, progress, color }: { label: string, value: number, total: number, progress: number, color: string }) => (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600 truncate">{label}</span>
                <span className="font-mono text-slate-400">{value}/{total} ({progress}%)</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                    className={`h-full ${color} rounded-full transition-all duration-500`} 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Sub-tab Navigation */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl shadow-inner w-fit mx-auto overflow-x-auto max-w-full">
                {(['Analista', 'Prioridade', 'Módulos', 'Backoffice', 'Mínimos'] as SubTabType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                            activeSubTab === tab 
                                ? 'bg-white text-indigo-600 shadow-md' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                        {tab === 'Analista' && <UserIcon className="w-4 h-4" />}
                        {tab === 'Prioridade' && <AlertTriangle className="w-4 h-4" />}
                        {tab === 'Módulos' && <Layers className="w-4 h-4" />}
                        {tab === 'Backoffice' && <BarChart3 className="w-4 h-4" />}
                        {tab === 'Mínimos' && <Target className="w-4 h-4" />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* 1. ANALISTA TAB */}
                {activeSubTab === 'Analista' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                            <div className="flex-1">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                                    <UserIcon className="w-6 h-6 text-indigo-500" /> Analista Selecionado
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Filtre por analista para visualizar métricas individuais detalhadas.</p>
                            </div>
                            <div className="min-w-[240px]">
                                <ModernSelect 
                                    value={selectedAnalyst}
                                    field="analyst"
                                    options={availableAnalysts}
                                    onChange={setSelectedAnalyst}
                                    placeholder="Escolha um analista..."
                                />
                            </div>
                        </div>

                        {selectedAnalyst ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    <StatCard label="Total Atribuído" value={stats.analystMetrics.total} icon={Layers} color="text-slate" />
                                    <StatCard label="Concluídos" value={stats.analystMetrics.success} icon={CheckCheck} color="text-emerald" />
                                    <StatCard label="Em Andamento" value={stats.analystMetrics.inProgress} icon={Activity} color="text-blue" />
                                    <StatCard label="Pendentes" value={stats.analystMetrics.pending} icon={Clock} color="text-indigo" />
                                    <StatCard label="Com Erro" value={stats.analystMetrics.error} icon={XCircle} color="text-red" />
                                    <StatCard label="Impedimentos" value={stats.analystMetrics.blocked} icon={AlertTriangle} color="text-amber" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Additional Analyst Analysis */}
                                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                                        <h4 className="font-black text-slate-700 uppercase tracking-widest text-xs border-b border-slate-100 pb-4">Análises Adicionais</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Tests by Module */}
                                            <div className="space-y-4">
                                                <h5 className="text-xs font-bold text-slate-500 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Testes por Módulo</h5>
                                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 text-sm">
                                                    {Object.entries(stats.analystMetrics.byModule).map(([mod, count]) => (
                                                        <div key={mod} className="flex justify-between p-2 rounded-lg bg-slate-50 font-bold text-slate-600">
                                                            <span className="truncate mr-2">{mod}</span>
                                                            <span className="text-indigo-600">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Tests by Priority */}
                                            <div className="space-y-4">
                                                <h5 className="text-xs font-bold text-slate-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Por Prioridade</h5>
                                                <div className="space-y-2 text-sm">
                                                    {['Alta', 'Média', 'Baixa'].map(p => (
                                                        <div key={p} className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${p === 'Alta' ? 'bg-red-500' : p === 'Média' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                            <span className="text-slate-600 font-bold flex-1">{p}</span>
                                                            <span className="font-mono text-slate-400">{stats.analystMetrics.byPriority[p] || 0}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                            {/* Tests by Minimum */}
                                            <div className="space-y-4">
                                                <h5 className="text-xs font-bold text-slate-500 flex items-center gap-2"><Target className="w-4 h-4" /> Por Mínimo</h5>
                                                <div className="flex gap-4">
                                                    <div className="flex-1 bg-emerald-50 p-3 rounded-2xl text-center border border-emerald-100">
                                                        <span className="block text-xl font-black text-emerald-600">{stats.analystMetrics.byMinimum['Sim'] || 0}</span>
                                                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Sim</span>
                                                    </div>
                                                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                                                        <span className="block text-xl font-black text-slate-600">{stats.analystMetrics.byMinimum['Não'] || 0}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Não</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Tests by Backoffice */}
                                            <div className="space-y-4">
                                                <h5 className="text-xs font-bold text-slate-500 flex items-center gap-2"><Layers className="w-4 h-4" /> Por Backoffice</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(stats.analystMetrics.byBackoffice).map(([bo, count]) => (
                                                        <div key={bo} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black border border-indigo-100">
                                                            {bo}: {count}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tests effectively with Analyst */}
                                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-black text-slate-700 uppercase tracking-widest text-xs">Atualmente com Analista</h4>
                                            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black">{stats.analystMetrics.currentTests.length} TESTES</span>
                                        </div>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                            {stats.analystMetrics.currentTests.map(t => (
                                                <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                                                    <div className="min-w-0">
                                                        <h5 className="font-black text-slate-700 text-sm truncate">{t.module}</h5>
                                                        <span className="text-[10px] font-mono text-slate-400 uppercase">{t.id}</span>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                        t.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' : 
                                                        t.status === 'Pendente' ? 'bg-slate-200 text-slate-600' :
                                                        t.status === 'Erro' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {t.status}
                                                    </div>
                                                </div>
                                            ))}
                                            {stats.analystMetrics.currentTests.length === 0 && (
                                                <div className="py-20 text-center text-slate-400">
                                                    <CheckCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                    <p className="font-bold text-sm">Todos os testes concluídos!</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                                <UserIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h4 className="font-black text-slate-800">Selecione um Analista</h4>
                                <p className="text-sm text-slate-500">Utilize o seletor acima para carregar as métricas.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. PRIORIDADE TAB */}
                {activeSubTab === 'Prioridade' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Header & Overview */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            {/* Donut Chart Card */}
                            <div className="lg:col-span-1 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center">
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-8 text-center w-full">Distribuição Global</h4>
                                <div className="relative w-48 h-48 mb-8">
                                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                        {(() => {
                                            const total = stats.priorityMetrics.reduce((acc, p) => acc + p.total, 0);
                                            let currentOffset = 0;
                                            return stats.priorityMetrics.map((p, i) => {
                                                if (total === 0) return null;
                                                const percentage = (p.total / total) * 100;
                                                const dashArray = `${percentage} ${100 - percentage}`;
                                                const dashOffset = -currentOffset;
                                                currentOffset += percentage;
                                                const colors = {
                                                    'Alta': '#ef4444', // red-500
                                                    'Média': '#f59e0b', // amber-500
                                                    'Baixa': '#3b82f6'  // blue-500
                                                };
                                                return (
                                                    <circle
                                                        key={p.level}
                                                        cx="18" cy="18" r="15.915"
                                                        fill="transparent"
                                                        stroke={colors[p.level as keyof typeof colors]}
                                                        strokeWidth="3.5"
                                                        strokeDasharray={dashArray}
                                                        strokeDashoffset={dashOffset}
                                                        className="transition-all duration-1000 ease-out"
                                                    />
                                                );
                                            });
                                        })()}
                                        <circle cx="18" cy="18" r="13" fill="white" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-slate-800">{stats.priorityMetrics.reduce((acc, p) => acc + p.total, 0)}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Geral</span>
                                    </div>
                                </div>
                                <div className="w-full space-y-3">
                                    {stats.priorityMetrics.map(p => (
                                        <div key={p.level} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:border-indigo-100 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${p.level === 'Alta' ? 'bg-red-500' : p.level === 'Média' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{p.level}</span>
                                            </div>
                                            <span className="font-mono text-xs font-black text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                {p.total} ({stats.priorityMetrics.reduce((acc, p) => acc + p.total, 0) > 0 ? Math.round((p.total / stats.priorityMetrics.reduce((acc, p) => acc + p.total, 0)) * 100) : 0}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Cards Grid */}
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {stats.priorityMetrics.map(p => {
                                    const progress = p.total > 0 ? Math.round((p.success / p.total) * 100) : 0;
                                    const colorTheme = p.level === 'Alta' ? 'red' : p.level === 'Média' ? 'amber' : 'blue';
                                    
                                    return (
                                        <div key={p.level} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col p-8 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-2xl font-black text-${colorTheme}-600 tracking-tight`}>{p.level}</h4>
                                                        {p.level === 'Alta' && <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prioridadae Operacional</p>
                                                </div>
                                                <div className={`px-4 py-2 rounded-2xl bg-${colorTheme}-50 border border-${colorTheme}-100 flex flex-col items-center`}>
                                                    <span className={`text-xl font-black text-${colorTheme}-600`}>{p.total}</span>
                                                    <span className={`text-[8px] font-black text-${colorTheme}-400 uppercase`}>Testes</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-8">
                                                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 hover:bg-emerald-50 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase">Concluídos</span>
                                                    </div>
                                                    <span className="text-xl font-black text-emerald-700">{p.success}</span>
                                                </div>
                                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 hover:bg-blue-50 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                                                        <span className="text-[10px] font-black text-blue-600 uppercase">Andamento</span>
                                                    </div>
                                                    <span className="text-xl font-black text-blue-700">{p.inProgress}</span>
                                                </div>
                                                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 hover:bg-red-50 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                        <span className="text-[10px] font-black text-red-600 uppercase">Erro</span>
                                                    </div>
                                                    <span className="text-xl font-black text-red-700">{p.error}</span>
                                                </div>
                                                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="text-[10px] font-black text-slate-500 uppercase">Pendente</span>
                                                    </div>
                                                    <span className="text-xl font-black text-slate-700">{p.pending}</span>
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-6 border-t border-slate-50 space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Throughput Geral</span>
                                                        <span className="text-lg font-black text-slate-800">{progress}% Completado</span>
                                                    </div>
                                                    <div className={`p-2 rounded-xl bg-${colorTheme}-50 text-${colorTheme}-600`}>
                                                        <Target className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                    <div 
                                                        className={`h-full ${p.level === 'Alta' ? 'bg-red-500' : p.level === 'Média' ? 'bg-amber-500' : 'bg-blue-500'} rounded-full transition-all duration-1000 shadow-sm`} 
                                                        style={{ width: `${progress}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Blocked Summary Card */}
                                <div className="bg-slate-900 rounded-[2rem] p-8 flex flex-col justify-between group overflow-hidden relative border border-slate-800">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-indigo-500/30 transition-colors" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/20">
                                                <AlertTriangle className="w-6 h-6 text-red-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-red-400 font-black text-lg">Impedimentos</h4>
                                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Atenção Crítica</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            {stats.priorityMetrics.map(p => (
                                                <div key={p.level} className="flex flex-col">
                                                    <span className="text-slate-500 text-[10px] font-black uppercase mb-1">{p.level}</span>
                                                    <span className="text-3xl font-black text-white">{p.blocked}</span>
                                                </div>
                                            ))}
                                            <div className="flex flex-col pt-4 col-span-2 border-t border-slate-800">
                                                <span className="text-slate-500 text-[10px] font-black uppercase mb-1">Total Impactado</span>
                                                <span className="text-4xl font-black text-white">{stats.priorityMetrics.reduce((acc, p) => acc + p.blocked, 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative z-10 mt-8">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
                                            <Activity className="w-3 h-3" /> Monitoramento em Tempo Real
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. MÓDULOS TAB */}
                {activeSubTab === 'Módulos' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Modules Ranking & Summary */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h3 className="font-black text-slate-800 flex items-center gap-2 text-xl">
                                        <Layers className="w-6 h-6 text-indigo-500" /> Ranking por Volume de Testes
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Identificação dos módulos com maior carga operacional e complexidade.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Módulos Ativos</span>
                                        <span className="text-xl font-black text-slate-700">{stats.moduleMetrics.length}</span>
                                    </div>
                                    <div className="px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col">
                                        <span className="text-[8px] font-black text-indigo-400 uppercase">Total de Testes</span>
                                        <span className="text-xl font-black text-indigo-600">{stats.total}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {stats.moduleMetrics
                                    .sort((a, b) => b.total - a.total)
                                    .slice(0, 5)
                                    .map((m, idx) => (
                                        <div key={m.name} className="relative group p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-default overflow-hidden">
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-600 text-white rounded-bl-2xl flex items-center justify-center font-black text-lg opacity-10 group-hover:opacity-100 transition-opacity">
                                                #{idx + 1}
                                            </div>
                                            <h4 className="font-black text-slate-700 text-sm line-clamp-1 mb-4 pr-6" title={m.name}>{m.name}</h4>
                                            <div className="flex items-end justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-black text-slate-800">{m.total}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Testes Atribuídos</span>
                                                </div>
                                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${m.progress > 75 ? 'bg-emerald-100 text-emerald-700' : m.progress > 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {m.progress}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Detailed Modules Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {stats.moduleMetrics.map(m => (
                                <div key={m.name} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                                    <div className="p-8 pb-4">
                                        <div className="flex justify-between items-start mb-6">
                                            <h4 className="font-black text-slate-800 text-base line-clamp-2 leading-tight flex-1 pr-4" title={m.name}>{m.name}</h4>
                                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <PieChart className="w-5 h-5" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            <div className="bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-100/50">
                                                <span className="text-emerald-700 font-black text-sm block">{m.success}</span>
                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Sucesso</span>
                                            </div>
                                            <div className="bg-blue-50/50 px-3 py-2 rounded-xl border border-blue-100/50">
                                                <span className="text-blue-700 font-black text-sm block">{m.inProgress}</span>
                                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">Andamento</span>
                                            </div>
                                            <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                                                <span className="text-slate-700 font-black text-sm block">{m.pending}</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Pendente</span>
                                            </div>
                                            <div className="bg-red-50/50 px-3 py-2 rounded-xl border border-red-100/50">
                                                <span className="text-red-700 font-black text-sm block">{m.error}</span>
                                                <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Erros</span>
                                            </div>
                                            <div className="bg-amber-50/50 px-3 py-2 rounded-xl border border-amber-100/50">
                                                <span className="text-amber-700 font-black text-sm block">{m.blocked}</span>
                                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">Imped.</span>
                                            </div>
                                            <div className="bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                                                <span className="text-white font-black text-sm block">{m.total}</span>
                                                <span className="text-slate-500 text-[8px] font-black uppercase tracking-tighter">Total</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto p-8 pt-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execução</span>
                                            <span className="text-sm font-black text-indigo-600">{m.progress}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                            <div 
                                                className={`h-full ${m.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'} rounded-full transition-all duration-1000 ease-in-out`} 
                                                style={{ width: `${m.progress}%` }} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. BACKOFFICE TAB */}
                {activeSubTab === 'Backoffice' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Stats */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex-1">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-xl">
                                    <BarChart3 className="w-6 h-6 text-indigo-500" /> Análise por Backoffice
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Visão granular do desempenho e progresso de cada setor operacional.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Backoffices</span>
                                    <span className="text-2xl font-black text-slate-700">{stats.backofficeMetrics.length}</span>
                                </div>
                                <div className="px-6 py-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center min-w-[120px]">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global OK</span>
                                    <span className="text-2xl font-black text-indigo-600">
                                        {stats.total > 0 ? Math.round((stats.backofficeMetrics.reduce((acc, bo) => acc + bo.success, 0) / stats.total) * 100) : 0}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Backoffice Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {stats.backofficeMetrics.map(bo => (
                                <div key={bo.name} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                                    <div className="p-8 pb-6">
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="space-y-1">
                                                <h4 className="text-2xl font-black text-slate-800 tracking-tight">{bo.name}</h4>
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                                    Pool Operacional
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <PieChart className="w-6 h-6" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                                            <div className="flex flex-col p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                                                <span className="text-[8px] font-black text-emerald-500 uppercase mb-1">OK</span>
                                                <span className="text-lg font-black text-emerald-700">{bo.success}</span>
                                            </div>
                                            <div className="flex flex-col p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                                <span className="text-[8px] font-black text-blue-500 uppercase mb-1">AND</span>
                                                <span className="text-lg font-black text-blue-700">{bo.inProgress}</span>
                                            </div>
                                            <div className="flex flex-col p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                                                <span className="text-[8px] font-black text-slate-400 uppercase mb-1">PEN</span>
                                                <span className="text-lg font-black text-slate-700">{bo.pending}</span>
                                            </div>
                                            <div className="flex flex-col p-3 bg-red-50/50 rounded-2xl border border-red-100/50">
                                                <span className="text-[8px] font-black text-red-500 uppercase mb-1">ERR</span>
                                                <span className="text-lg font-black text-red-700">{bo.error}</span>
                                            </div>
                                            <div className="flex flex-col p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                                <span className="text-[8px] font-black text-amber-500 uppercase mb-1">IMP</span>
                                                <span className="text-lg font-black text-amber-700">{bo.blocked}</span>
                                            </div>
                                            <div className="flex flex-col p-3 bg-slate-900 rounded-2xl border border-slate-800">
                                                <span className="text-[8px] font-black text-slate-500 uppercase mb-1">TOT</span>
                                                <span className="text-lg font-black text-white">{bo.total}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso Backoffice</span>
                                                <span className="text-sm font-black text-indigo-600">{bo.progress}%</span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                <div 
                                                    className={`h-full ${bo.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'} rounded-full transition-all duration-1000 shadow-sm`}
                                                    style={{ width: `${bo.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Module Breakdown Section */}
                                    <div className="mt-auto border-t border-slate-50 bg-slate-50/30 p-8">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Layers className="w-3.5 h-3.5" /> Métricas por Módulo
                                        </h5>
                                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                            {bo.byModule.map(m => (
                                                <div key={m.name} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 group/item hover:border-indigo-200 transition-all">
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-[11px] font-black text-slate-700 truncate block" title={m.name}>{m.name}</span>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${m.progress}%` }} />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400">{m.progress}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-[10px] font-black text-slate-600 px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">{m.total}</span>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${m.progress === 100 ? 'bg-emerald-500' : m.progress > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. MÍNIMOS TAB */}
                {activeSubTab === 'Mínimos' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Global Metrics Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <StatCard label="Total Mínimos" value={stats.minimumsMetrics.total} icon={Target} color="text-indigo" />
                            <StatCard label="Concluídos" value={stats.minimumsMetrics.success} icon={CheckCheck} color="text-emerald" />
                            <StatCard label="Em Andamento" value={stats.minimumsMetrics.inProgress} icon={Activity} color="text-blue" />
                            <StatCard label="Pendentes" value={stats.minimumsMetrics.pending} icon={Clock} color="text-slate" />
                            <StatCard label="Restantes" value={stats.minimumsMetrics.remaining} icon={Timer} color="text-red" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Modules List - Compact */}
                            <div className="lg:col-span-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
                                <h4 className="font-black text-slate-700 uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-500" /> Mínimos por Módulo
                                </h4>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                    {stats.minimumsMetrics.byModule.map(m => (
                                        <div key={m.name} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black text-slate-800 truncate pr-2">{m.name}</span>
                                                <span className="text-[10px] font-black text-indigo-600">{m.progress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${m.progress}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                    {stats.minimumsMetrics.byModule.length === 0 && (
                                        <div className="py-20 text-center text-slate-400">
                                            <Target className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs font-bold">Nenhum teste mínimo definido.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Global Summary - Compact */}
                            <div className="lg:col-span-8 bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center group">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-indigo-500/20 transition-all duration-700" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -ml-32 -mb-32 group-hover:bg-emerald-500/20 transition-all duration-700" />
                                
                                <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-around gap-8">
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                                            <PieChart className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-white text-lg font-black tracking-tight">Progresso Global</h4>
                                            <p className="text-slate-500 text-[8px] font-bold uppercase tracking-[0.2em]">Cenário Crítico</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="text-7xl font-black text-white tracking-tighter leading-none mb-4">
                                            {stats.minimumsMetrics.total > 0 ? Math.round((stats.minimumsMetrics.success / stats.minimumsMetrics.total) * 100) : 0}<span className="text-3xl text-indigo-500 ml-1">%</span>
                                        </div>
                                        <div className="w-48 h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                                            <div 
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                                                style={{ width: `${stats.minimumsMetrics.total > 0 ? Math.round((stats.minimumsMetrics.success / stats.minimumsMetrics.total) * 100) : 0}%` }} 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-4 md:pt-0">
                                        <div className="flex flex-col items-start border-l border-slate-800 pl-4">
                                            <span className="text-[8px] font-black text-slate-500 uppercase">OK</span>
                                            <span className="text-xl font-black text-white">{stats.minimumsMetrics.success}</span>
                                        </div>
                                        <div className="flex flex-col items-start border-l border-slate-800 pl-4">
                                            <span className="text-[8px] font-black text-slate-500 uppercase">REST</span>
                                            <span className="text-xl font-black text-red-400">{stats.minimumsMetrics.remaining}</span>
                                        </div>
                                        <div className="flex flex-col items-start border-l border-slate-800 pl-4 col-span-2">
                                            <span className="text-[8px] font-black text-slate-500 uppercase">VOLUME TOTAL</span>
                                            <span className="text-xl font-black text-indigo-400">{stats.minimumsMetrics.total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Minimums by Backoffice Grid - Compact but Prominent */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3">
                                <h4 className="font-black text-slate-800 uppercase tracking-[0.15em] text-[11px] whitespace-nowrap px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-indigo-500" /> Progresso Mínimos por Backoffice
                                </h4>
                                <div className="h-px bg-slate-200 flex-1" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
                                {stats.minimumsMetrics.byBackoffice.map(bo => (
                                    <div key={bo.name} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-4 hover:shadow-lg hover:border-indigo-300 transition-all flex flex-col group relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <h5 className="font-black text-slate-800 text-sm line-clamp-1 pr-2 uppercase" title={bo.name}>{bo.name}</h5>
                                            <div className="text-indigo-600 font-black text-[12px] bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                                {bo.progress}%
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                                            <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50 flex flex-col">
                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">CONCLUÍDO</span>
                                                <span className="text-xl font-black text-emerald-800 leading-none mt-1">{bo.success}</span>
                                            </div>
                                            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col col-span-1">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">TOTAL</span>
                                                <span className="text-xl font-black text-white leading-none mt-1">{bo.total}</span>
                                            </div>
                                            <div className="bg-blue-50/50 px-2 py-1.5 rounded-lg border border-blue-100/30 flex justify-between items-center col-span-1">
                                                <span className="text-[7px] font-black text-blue-500 uppercase">AND</span>
                                                <span className="text-xs font-black text-blue-700">{bo.inProgress}</span>
                                            </div>
                                            <div className="bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-200 flex justify-between items-center col-span-1">
                                                <span className="text-[7px] font-black text-slate-400 uppercase">PEN</span>
                                                <span className="text-xs font-black text-slate-700">{bo.pending}</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto relative z-10">
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                <div 
                                                    className={`h-full ${bo.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'} rounded-full transition-all duration-1000`} 
                                                    style={{ width: `${bo.progress}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default DashboardTab;
