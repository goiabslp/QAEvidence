import React, { useState, useEffect } from 'react';
import { X, Calendar, Activity, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Target, Check, RefreshCw } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { User } from '../../../types';

interface DailyMetricsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

const DailyMetricsModal: React.FC<DailyMetricsModalProps> = ({ isOpen, onClose, user }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [metrics, setMetrics] = useState({
        emAndamento: 0,
        sucesso: 0,
        erro: 0,
        impedimento: 0
    });

    // Daily Goal States
    const [dailyGoal, setDailyGoal] = useState<number>(user?.dailyGoal || 0);
    const [isDailyGoalAuto, setIsDailyGoalAuto] = useState<boolean>(user?.isDailyGoalAuto || false);
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [goalSaveSuccess, setGoalSaveSuccess] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;

        const fetchMetrics = async () => {
            setIsLoading(true);
            try {
                // Determine today's date range (in local/Brazil time or just simple start/end of current date)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const startOfDay = today.toISOString();
                
                const endOfDayDate = new Date(today);
                endOfDayDate.setHours(23, 59, 59, 999);
                const endOfDay = endOfDayDate.toISOString();

                // Count tests executed by the user today
                const { data, error } = await supabase
                    .from('excel_test_records')
                    .select('result, updated_at')
                    .eq('analyst', user.acronym)
                    .gte('updated_at', startOfDay)
                    .lte('updated_at', endOfDay);

                if (error) throw error;

                // Process metrics
                const counts = {
                    emAndamento: 0,
                    sucesso: 0,
                    erro: 0,
                    impedimento: 0
                };

                (data || []).forEach((item: any) => {
                    const status = (item.result || '').toLowerCase();
                    if (status.includes('pendente')) counts.emAndamento++;
                    else if (status.includes('sucesso')) counts.sucesso++;
                    else if (status.includes('falha') || status.includes('erro')) counts.erro++;
                    else if (status.includes('impedimento') || status.includes('andamento') && !status.includes('em')) counts.impedimento++;
                    else if (status.includes('andamento')) counts.emAndamento++;
                });

                setMetrics(counts);
            } catch (error) {
                console.error('Erro ao buscar métricas:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetrics();
    }, [isOpen, user]);

    if (!isOpen) return null;

    if (!isOpen) return null;

    const total = metrics.sucesso + metrics.erro + metrics.impedimento;
    const remaining = Math.max(0, dailyGoal - total);
    
    // Progress calculation
    const progressPercentage = dailyGoal > 0 ? Math.min(100, Math.round((total / dailyGoal) * 100)) : 0;
    
    const todayFormatted = new Date().toLocaleDateString('pt-BR');

    const handleSaveGoal = async () => {
        if (!user) return;
        setIsSavingGoal(true);
        setGoalSaveSuccess(false);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    daily_goal: dailyGoal,
                    is_daily_goal_auto: isDailyGoalAuto
                })
                .eq('id', user.id);

            if (error) throw error;
            
            // Show success briefly
            setGoalSaveSuccess(true);
            setTimeout(() => setGoalSaveSuccess(false), 2000);
            
            // Optionally update the user object if it was passed with a setter, 
            // but since it's just a prop, updating DB is enough for next reload.
        } catch (error: any) {
            console.error("Erro ao salvar meta:", error);
            alert("Erro ao salvar a meta diária.");
        } finally {
            setIsSavingGoal(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                            <Activity className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Métricas Diárias de Testes</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-sm font-medium text-slate-500">{todayFormatted}</span>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors flex-shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Content Container - Compact & No Scroll */}
                <div className="p-5 md:p-6 lg:p-7">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            <p className="text-slate-500 font-medium animate-pulse">Calculando sua produtividade...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                            
                            {/* Left Column: Meta Configuration & Progress Summary - MORE SPACE */}
                            <div className="lg:col-span-6 space-y-4">
                                
                                {/* Meta Config Card - Comfortable */}
                                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1 px-2 bg-indigo-50 rounded-lg shrink-0">
                                            <Target className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Configuração de Meta</h3>
                                    </div>
                                    
                                    <div className="flex flex-col gap-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Meta Diária</label>
                                                <input 
                                                    type="number"
                                                    min="0"
                                                    value={dailyGoal}
                                                    onChange={(e) => setDailyGoal(parseInt(e.target.value) || 0)}
                                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-base"
                                                    placeholder="0"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Automática</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDailyGoalAuto(!isDailyGoalAuto)}
                                                    className={`w-full py-2 rounded-xl border text-xs font-black transition-all shadow-sm ${
                                                        isDailyGoalAuto ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'
                                                    }`}
                                                >
                                                    {isDailyGoalAuto ? 'ATIVADO' : 'DESLIGADO'}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveGoal}
                                            disabled={isSavingGoal}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-indigo-200 disabled:opacity-50 active:scale-[0.98]"
                                        >
                                            {isSavingGoal ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : goalSaveSuccess ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            {goalSaveSuccess ? 'CONFIGURAÇÃO SALVA!' : 'SALVAR PREFERÊNCIAS'}
                                        </button>
                                    </div>
                                </div>

                                {/* Summary & Progress Circle - Modernized & Larger */}
                                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50 flex flex-col justify-between relative overflow-hidden group flex-1">
                                    {/* Background decorative element */}
                                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                                    
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <h3 className="text-[11px] font-black text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                                            <RefreshCw className="w-3.5 h-3.5 animate-slow-spin" /> Progresso Diário
                                        </h3>
                                        {progressPercentage >= 100 && (
                                            <div className="bg-emerald-400/20 text-emerald-300 text-[9px] font-black px-2.5 py-1 rounded-full border border-emerald-400/30 animate-pulse">
                                                EXCELENTE
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-6 relative z-10 py-2">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                                                <span className="text-[11px] font-medium text-indigo-100">Cota</span>
                                                <span className="text-base font-black tracking-tight">{dailyGoal > 0 ? dailyGoal : '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                                                <span className="text-[11px] font-medium text-indigo-100">Realizado</span>
                                                <span className="text-base font-black tracking-tight">{total}</span>
                                            </div>
                                            <div className="flex flex-col pt-1">
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-indigo-200">
                                                    {progressPercentage >= 100 ? 'Meta Atingida! ✨' : 
                                                     progressPercentage >= 75 ? 'Reta final!' :
                                                     progressPercentage >= 50 ? 'Metade concluída' :
                                                     progressPercentage > 0 ? 'Em evolução...' : 'Aguardando início'}
                                                </span>
                                                <span className={`text-xl font-black leading-none mt-1.5 ${remaining === 0 ? 'text-emerald-300' : 'text-white'}`}>
                                                    {remaining === 0 ? 'CONCLUÍDO' : `${remaining} restantes`}
                                                </span>
                                            </div>
                                        </div>

                                        {dailyGoal > 0 && (
                                            <div className="relative shrink-0 flex items-center justify-center w-28 h-28">
                                                {/* Glow effect for progress */}
                                                <div className="absolute inset-0 rounded-full bg-indigo-400/20 blur-xl scale-95 animate-pulse"></div>
                                                <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                                                    <circle
                                                        cx="56"
                                                        cy="56"
                                                        r="48"
                                                        className="fill-none stroke-white/10 stroke-[8px]"
                                                    />
                                                    <circle
                                                        cx="56"
                                                        cy="56"
                                                        r="48"
                                                        className={`fill-none ${progressPercentage >= 100 ? 'stroke-emerald-400' : 'stroke-white'} stroke-[8px] transition-all duration-1000 ease-out`}
                                                        strokeDasharray={301.6}
                                                        strokeDashoffset={301.6 - (301.6 * Math.min(progressPercentage, 100)) / 100}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-lg font-black leading-none tracking-tighter">{progressPercentage}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Status Metric Cards Grid - MORE VISIBLE */}
                            <div className="lg:col-span-6">
                                <div className="grid grid-cols-2 gap-3 h-full">
                                    
                                    {/* Sucesso */}
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-1 -translate-y-1 group-hover:scale-110 transition-all duration-500">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                                        </div>
                                        <div className="relative z-10 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
                                            <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Sucesso</span>
                                        </div>
                                        <div className="relative z-10 mt-2">
                                            <span className="text-4xl font-black text-emerald-700 tracking-tighter sm:text-5xl">
                                                {metrics.sucesso}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Erro */}
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-1 -translate-y-1 group-hover:scale-110 transition-all duration-500">
                                            <AlertCircle className="w-12 h-12 text-red-600" />
                                        </div>
                                        <div className="relative z-10 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm animate-pulse"></div>
                                            <span className="text-xs font-black text-red-800 uppercase tracking-widest">Erro</span>
                                        </div>
                                        <div className="relative z-10 mt-2">
                                            <span className="text-4xl font-black text-red-700 tracking-tighter sm:text-5xl">
                                                {metrics.erro}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Em Andamento */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-1 -translate-y-1 group-hover:scale-110 transition-all duration-500">
                                            <Loader2 className="w-12 h-12 text-blue-600" />
                                        </div>
                                        <div className="relative z-10 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm animate-pulse"></div>
                                            <span className="text-xs font-black text-blue-800 uppercase tracking-widest">Ativo</span>
                                        </div>
                                        <div className="relative z-10 mt-2">
                                            <span className="text-4xl font-black text-blue-700 tracking-tighter sm:text-5xl">
                                                {metrics.emAndamento}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Impedimento */}
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 relative overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-1 -translate-y-1 group-hover:scale-110 transition-all duration-500">
                                            <AlertTriangle className="w-12 h-12 text-amber-600" />
                                        </div>
                                        <div className="relative z-10 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm animate-pulse"></div>
                                            <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Impedimento</span>
                                        </div>
                                        <div className="relative z-10 mt-2">
                                            <span className="text-4xl font-black text-amber-700 tracking-tighter sm:text-5xl">
                                                {metrics.impedimento}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 text-sm font-black text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm active:scale-95"
                    >
                        FECHAR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyMetricsModal;
