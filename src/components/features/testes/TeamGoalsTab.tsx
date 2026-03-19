import React, { useState, useEffect } from 'react';
import { ExcelTestRecord, User } from '../../../types';
import { Target, TrendingUp, Calendar, Zap, Save, Loader2, Award } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import ModernSelect from '../../common/ModernSelect';

interface TeamGoalsTabProps {
    user: User;
    testRecords: ExcelTestRecord[]; // These are already filtered by Backoffice and MinimoSim in parent
    allRecords: ExcelTestRecord[];  // To extract all available backoffices
    isMinimoSimActive?: boolean;
    onToggleMinimoSim?: () => void;
    selectedBackoffice: string;
    onBackofficeChange: (backoffice: string) => void;
}

interface GoalConfig {
    dailyCount: number;
    weeklyCount: number;
    monthlyCount: number;
    isAutoCalculated?: boolean;
    sprintEndDate?: string;
}

const TeamGoalsTab: React.FC<TeamGoalsTabProps> = ({ 
    user, 
    testRecords, 
    allRecords,
    isMinimoSimActive, 
    onToggleMinimoSim,
    selectedBackoffice,
    onBackofficeChange
}) => {
    const [goals, setGoals] = useState<GoalConfig>({ 
        dailyCount: 10, 
        weeklyCount: 50, 
        monthlyCount: 200, 
        isAutoCalculated: true 
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
    
    // Derived Metrics
    const [achieved, setAchieved] = useState({ daily: 0, weekly: 0, monthly: 0 });
    const [analystCount, setAnalystCount] = useState<number>(1); // To divide team goals

    // Extract all unique backoffices from the complete record set
    const backoffices = React.useMemo(() => {
        const unique = Array.from(new Set(allRecords.map(r => r.backoffice))).filter(b => b && typeof b === 'string' && b.trim() !== '');
        return ['Todos', ...unique.sort()];
    }, [allRecords]);

    useEffect(() => {
        // Load goals from user settings if available
        if (user.settings?.team_goals) {
            const savedGoals = user.settings.team_goals as GoalConfig;
            // Provide default for isAutoCalculated if migrating from old data
            if (savedGoals.isAutoCalculated === undefined) {
                savedGoals.isAutoCalculated = true;
            }
            setGoals(savedGoals);
        }
    }, [user.settings]);

    useEffect(() => {
        // Fetch number of active analysts
        const fetchAnalystCount = async () => {
            try {
                const { count, error } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true)
                    .eq('is_analyst', true);
                
                if (!error && count && count > 0) {
                    setAnalystCount(count);
                }
            } catch (err) {
                console.error('Error fetching analyst count:', err);
            }
        };
        fetchAnalystCount();
    }, []);

    const getBusinessDaysLeft = (targetDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(0, 0, 0, 0);

        if (end < today) return 0;

        let count = 0;
        const current = new Date(today);
        while (current <= end) {
            const day = current.getDay();
            if (day !== 0 && day !== 6) { // Not Sunday or Saturday
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    useEffect(() => {
        // IMPORTANT: testRecords are already filtered by Backoffice and MinimoSim in TestSettings.tsx
        const total = testRecords.length;
        const completed = testRecords.filter(t => t.result === 'Sucesso').length;
        
        // --- 1. Update Achieved Metrics ---
        // Mocking daily/weekly for demonstration until real timestamps exist
        // Using a more dynamic mock based on completion
        const dailyAchieved = Math.floor(completed * 0.1); 
        const weeklyAchieved = Math.floor(completed * 0.4);
        
        setAchieved({
            daily: dailyAchieved,
            weekly: weeklyAchieved,
            monthly: completed
        });

        // --- 2. Dynamic Auto-calculation Rule ---
        if (goals.isAutoCalculated) {
            // Dynamic Remaining Calculation
            const remaining = Math.max(0, total - completed);
            
            let weeklyGoal = 0;
            let dailyGoal = 0;

            if (goals.sprintEndDate) {
                const businessDays = getBusinessDaysLeft(goals.sprintEndDate);
                if (businessDays > 0) {
                    // Divide the raw team target by the number of analysts to get INDIVIDUAL targets
                    dailyGoal = Math.ceil((remaining / businessDays) / analystCount);
                    // Proportional weekly target based on remaining capacity
                    weeklyGoal = Math.ceil((remaining / (businessDays / 5)) / analystCount);
                } else {
                    dailyGoal = Math.ceil(remaining / analystCount);
                    weeklyGoal = Math.ceil(remaining / analystCount);
                }
            } else {
                weeklyGoal = Math.ceil((remaining / 4) / analystCount);
                dailyGoal = Math.ceil((remaining / 20) / analystCount);
            }
            
            // Note: Monthly goal should also represent the individual share? 
            // The prompt says "As metas por equipe devem ser dividias pelo numero total de Analistas"
            // So the monthly goal displayed / stored should also be divided.
            const individualMonthlyGoal = Math.ceil(total / analystCount);

            setGoals(prev => {
                if (prev.monthlyCount === individualMonthlyGoal && prev.weeklyCount === weeklyGoal && prev.dailyCount === dailyGoal) {
                    return prev;
                }
                return {
                    ...prev,
                    monthlyCount: individualMonthlyGoal,
                    weeklyCount: weeklyGoal,
                    dailyCount: dailyGoal
                };
            });
        }
    }, [testRecords, goals.isAutoCalculated, isMinimoSimActive, goals.sprintEndDate, selectedBackoffice, analystCount]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const currentSettings = user.settings || {};
            const newSettings = { ...currentSettings, team_goals: goals };
            
            const { error } = await supabase
                .from('profiles')
                .update({ settings: newSettings })
                .eq('id', user.id);

            if (error) throw error;
            setIsEditing(false);
        } catch (err: any) {
            alert('Erro ao salvar as metas: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: keyof GoalConfig, val: number) => {
        setGoals(prev => ({
            ...prev,
            [field]: val,
            isAutoCalculated: false
        }));
    };

    const renderProgressBar = (current: number, target: number) => {
        const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
        return (
            <div className="mt-4">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-700">{pct}% Concluído</span>
                    <span className="text-xs font-semibold text-slate-500">{current} / {target} testes</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500 relative'}`} 
                        style={{ width: `${pct}%` }}
                    >
                        {pct < 100 && pct > 0 && <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/20 blur-[2px] animate-[pulse_2s_ease-in-out_infinite]" />}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header and Editing Mode Toggle */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="shrink-0">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Target className="w-5 h-5 text-indigo-600" />
                            Metas de Produtividade
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Acompanhe o ritmo do time e defina alvos de execução.</p>
                    </div>
                    
                    <div className="flex items-center justify-start lg:justify-end gap-3 flex-1">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 whitespace-nowrap"
                        >
                            {isEditing ? 'Cancelar Edição' : 'Ajustar Meta'}
                        </button>
                        
                        <button
                            onClick={() => setIsSprintModalOpen(true)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all border whitespace-nowrap ${
                                goals.sprintEndDate 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="hidden sm:inline">{goals.sprintEndDate ? `Fim: ${new Date(goals.sprintEndDate).toLocaleDateString()}` : 'Data Sprint'}</span>
                            <span className="sm:hidden">{goals.sprintEndDate ? 'Sprint' : 'Sprint'}</span>
                        </button>
                        
                        {/* Minimum Toggle */}
                        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl shrink-0">
                            <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Mínimo SIM</span>
                            <button 
                                onClick={onToggleMinimoSim}
                                className={`w-11 h-6 rounded-full transition-colors relative shadow-inner shrink-0 ${isMinimoSimActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${isMinimoSimActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        {/* Backoffice Filter - Modern Select */}
                        <div className="shrink-0 flex items-center">
                            <ModernSelect
                                value={selectedBackoffice}
                                onChange={onBackofficeChange}
                                options={backoffices}
                                variant="listing"
                                placeholder="Backoffice"
                                showSelectedValue={false}
                                field="analyst" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Intelligence / Suggestion */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-indigo-100 rounded-xl shrink-0 mt-1">
                    <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-indigo-900 mb-1">Inteligência Dinâmica de Metas</h4>
                    <p className="text-xs text-indigo-800/80 leading-relaxed">
                        {goals.isAutoCalculated ? (
                            <>
                                O volume total de mercado é de <strong>{testRecords.length}</strong> testes filtrados 
                                {selectedBackoffice !== 'Todos' && <> do backoffice <strong>{selectedBackoffice}</strong></>}
                                {isMinimoSimActive && <> (apenas Mínimos)</>}.<br/>
                                <span className="text-emerald-700 font-black">Meta dividida para {analystCount} Analistas Ativos.</span><br/>
                                A sua meta total é de <strong>{goals.monthlyCount}</strong>. Restam <strong>{Math.max(0, goals.monthlyCount - achieved.monthly)}</strong>.<br/>
                                {goals.sprintEndDate ? (
                                    <>
                                        Com o fim da sprint em <strong>{new Date(goals.sprintEndDate).toLocaleDateString()}</strong> ({getBusinessDaysLeft(goals.sprintEndDate)} dias úteis restantes), 
                                        a produtividade necessária é de <strong>{goals.dailyCount}</strong> testes por dia para este filtro.
                                    </>
                                ) : (
                                    <>Para concluir essa carga restante, a produtividade recalculada e sugerida é de <strong>{goals.weeklyCount}</strong> testes por semana e <strong>{goals.dailyCount}</strong> testes por dia útil.</>
                                )}
                            </>
                        ) : (
                            <>
                                O cálculo automático está <strong>Manual</strong>.<br/>
                                Para atingir a meta isolada de <strong>{goals.monthlyCount}</strong> testes, a equipe precisaria executar em média <strong>{Math.ceil(goals.monthlyCount / 20)}</strong> testes por dia.
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Progress Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Daily */}
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group">
                    {achieved.daily >= goals.dailyCount && goals.dailyCount > 0 && (
                        <div className="absolute top-0 right-0 p-4 opacity-10 flex items-center justify-center">
                            <Award className="w-24 h-24 text-emerald-500" />
                        </div>
                    )}
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-700 flex items-center gap-2">
                                Meta Diária
                                {isEditing && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${goals.isAutoCalculated ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {goals.isAutoCalculated ? 'Automático' : 'Manual'}
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs font-semibold text-slate-400">Hoje</p>
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-2 relative z-10">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alvo de Testes</label>
                            <input 
                                type="number" 
                                value={goals.dailyCount} 
                                onChange={e => handleChange('dailyCount', Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-lg font-bold text-slate-700"
                            />
                        </div>
                    ) : (
                        <div className="relative z-10">
                            {renderProgressBar(achieved.daily, goals.dailyCount)}
                        </div>
                    )}
                </div>

                {/* Weekly */}
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group">
                    {achieved.weekly >= goals.weeklyCount && goals.weeklyCount > 0 && (
                        <div className="absolute top-0 right-0 p-4 opacity-10 flex items-center justify-center">
                            <Award className="w-24 h-24 text-emerald-500" />
                        </div>
                    )}
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-700 flex items-center gap-2">
                                Meta Semanal
                                {isEditing && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${goals.isAutoCalculated ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {goals.isAutoCalculated ? 'Automático' : 'Manual'}
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs font-semibold text-slate-400">Esta semana</p>
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-2 relative z-10">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alvo de Testes</label>
                            <input 
                                type="number" 
                                value={goals.weeklyCount} 
                                onChange={e => handleChange('weeklyCount', Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-lg font-bold text-slate-700"
                            />
                        </div>
                    ) : (
                        <div className="relative z-10">
                            {renderProgressBar(achieved.weekly, goals.weeklyCount)}
                        </div>
                    )}
                </div>

                {/* Monthly */}
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden group">
                    {achieved.monthly >= goals.monthlyCount && goals.monthlyCount > 0 && (
                        <div className="absolute top-0 right-0 p-4 opacity-10 flex items-center justify-center">
                            <Award className="w-24 h-24 text-emerald-500" />
                        </div>
                    )}
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <Target className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-700 flex items-center gap-2">
                                Meta Total
                                {isEditing && (
                                    <button 
                                        onClick={() => {
                                            if (!goals.isAutoCalculated) {
                                                setGoals(prev => ({...prev, isAutoCalculated: true}));
                                            }
                                        }}
                                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider transition-colors ${goals.isAutoCalculated ? 'bg-indigo-100 text-indigo-700 cursor-default' : 'bg-slate-200 text-slate-600 hover:bg-indigo-600 hover:text-white cursor-pointer'}`}
                                        title={goals.isAutoCalculated ? "Cálculo Automático Ativo" : "Clique para reativar o Cálculo Automático para as metas Semanal e Diária"}
                                    >
                                        Mestre
                                    </button>
                                )}
                            </h3>
                            <p className="text-xs font-semibold text-slate-400">Total Filtrado</p>
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-2 relative z-10">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alvo de Testes</label>
                            <input 
                                type="number" 
                                value={goals.monthlyCount} 
                                onChange={e => handleChange('monthlyCount', Number(e.target.value))}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-lg font-bold text-slate-700"
                            />
                        </div>
                    ) : (
                        <div className="relative z-10">
                            {renderProgressBar(achieved.monthly, goals.monthlyCount)}
                        </div>
                    )}
                </div>
            </div>

            {/* Sprint Date Modal */}
            {isSprintModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                Data Final da Sprint
                            </h3>
                            <button 
                                onClick={() => setIsSprintModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600">Selecione o Prazo Final</label>
                                <p className="text-xs text-slate-400">O sistema usará esta data para recalcular automaticamente as metas diárias com base nos dias úteis restantes.</p>
                                <input 
                                    type="date" 
                                    value={goals.sprintEndDate || ''}
                                    onChange={(e) => setGoals({...goals, sprintEndDate: e.target.value, isAutoCalculated: true})}
                                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:outline-none transition-all text-lg font-bold text-slate-700"
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    await handleSave();
                                    setIsSprintModalOpen(false);
                                }}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                Salvar Prazo da Sprint
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamGoalsTab;
