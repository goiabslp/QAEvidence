import React, { useState, useEffect, useMemo } from 'react';
import { Beaker, Settings, ChevronDown, ChevronUp, AlertCircle, FileSpreadsheet, CheckCircle2, ShieldAlert, Activity, Search, Target, RefreshCw, Filter, X } from 'lucide-react';
import { ExcelTestRecord, TestColumnSettings, DEFAULT_COLUMN_SETTINGS, DEFAULT_COLUMN_ORDER, TestColumnKey } from '../../../types';
import { COLUMN_LABELS } from './TestSettings';
import ConfirmEditModal from './ConfirmEditModal';
import DailyMetricsModal from './DailyMetricsModal';
import TestFilterModal from './TestFilterModal';
import { User } from '../../../types';
import { supabase } from '@/services/supabaseClient';
import { FilterState, INITIAL_FILTER_STATE } from '../../../types';

// Fields that cannot be edited per user requirements
const NON_EDITABLE_FIELDS: TestColumnKey[] = [
    'testId', 'bank', 'backoffice', 'module', 'analyst', 'priority', 'mobile', 'browser',
    'stepsText',
    'bcsCode',
    'useCase',
    'estimatedTime',
    'gap'
];

// Sorting Helpers
const getPriorityWeight = (priority: string): number => {
    switch (priority) {
        case 'Alta': return 3;
        case 'Média': return 2;
        case 'Baixa': return 1;
        default: return 0;
    }
};

const getMinimumWeight = (minimum: string): number => {
    return minimum === 'Sim' ? 2 : 1;
};

const extractTestIdNumber = (testId: string): number => {
    if (!testId) return 0;
    const match = testId.match(/(\d+)/);
    return match ? parseInt(match[0], 10) : 0;
};

interface TestManagementProps {
    onOpenSettings: () => void;
    testColumnSettings?: TestColumnSettings;
    user: User | null;
}

const TestManagement: React.FC<TestManagementProps> = ({ 
    onOpenSettings,
    testColumnSettings: propTestColumnSettings,
    user
}) => {
    const testColumnSettings = propTestColumnSettings || DEFAULT_COLUMN_SETTINGS;
    const [tests, setTests] = useState<ExcelTestRecord[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Inline Edit State
    const [editState, setEditState] = useState<{
        isOpen: boolean;
        testId: string | null;
        field: TestColumnKey | null;
        oldValue: string;
        newValue: string;
        isSaving: boolean;
    }>({
        isOpen: false,
        testId: null,
        field: null,
        oldValue: '',
        newValue: '',
        isSaving: false
    });

    // Direct Edit State (Complex Fields)
    const [directEdit, setDirectEdit] = useState<{
        testId: string | null;
        field: TestColumnKey | null;
        value: string;
    }>({
        testId: null,
        field: null,
        value: ''
    });
    const [isSavingDirect, setIsSavingDirect] = useState(false);
    const [analysts, setAnalysts] = useState<string[]>([]);

    // Batch Action State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);

    // Filter State
    const [filterState, setFilterState] = useState<FilterState>(INITIAL_FILTER_STATE);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(50);

    // Fetch analysts list
    useEffect(() => {
        const fetchAnalysts = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('acronym')
                    .eq('is_active', true)
                    .order('acronym');
                
                if (error) throw error;
                if (data) {
                    setAnalysts(data.map(p => p.acronym).filter(a => a && a !== 'ADM'));
                }
            } catch (err) {
                console.error('Error fetching analysts:', err);
            }
        };
        fetchAnalysts();
    }, []);

    // Reset pagination when filters change
    useEffect(() => {
        setVisibleCount(50);
    }, [searchTerm, filterState]);

    // Load tests from Supabase
    useEffect(() => {
        const fetchTests = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('excel_test_records')
                    .select('*')
                    .eq('created_by', user.id)
                    .order('module', { ascending: true })
                    .order('use_case', { ascending: true })
                    .order('priority', { ascending: true })
                    .order('tag_id', { ascending: true });

                if (error) throw error;
                
                if (data) {
                    // Map snake_case to camelCase
                    const mappedTests = data.map((item: any) => ({
                        id: item.id,
                        stepsText: item.steps_text,
                        browser: item.browser,
                        bank: item.bank,
                        backoffice: item.backoffice,
                        mobile: item.mobile,
                        analyst: item.analyst,
                        automated: item.automated,
                        bcsCode: item.bcs_code,
                        useCase: item.use_case,
                        minimum: item.minimum,
                        priority: item.priority,
                        testId: item.test_id,
                        module: item.module,
                        objective: item.objective,
                        estimatedTime: item.estimated_time,
                        prerequisite: item.prerequisite,
                        description: item.description,
                        acceptanceCriteria: item.acceptance_criteria,
                        result: item.result,
                        errorStatus: item.error_status,
                        observation: item.observation,
                        gap: item.gap,
                        tagId: item.tag_id
                    }));
                    setTests(mappedTests);
                }
            } catch (error) {
                console.error('Error fetching tests:', error);
            }
        };

        fetchTests();
    }, [user, isMetricsModalOpen]); // Reload if modal closes in case there were updates

    const handleResultChange = async (testId: string, newResult: string) => {
        if (!user) return;
        
        const isPending = newResult === 'Pendente';
        const newAnalyst = isPending ? '' : user.acronym;

        // Optimistic UI update
        setTests(prev => prev.map(t => 
            t.id === testId 
                ? { ...t, result: newResult, analyst: newAnalyst } 
                : t
        ));

        // Save to Supabase
        try {
            const { error } = await supabase
                .from('excel_test_records')
                .update({ 
                    result: newResult,
                    analyst: newAnalyst,
                    updated_at: new Date().toISOString()
                })
                .eq('id', testId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating test result:', error);
            // Could revert UI here on fail
        }
    };

    const handleBatchResultChange = async (newResult: string) => {
        if (!user || selectedIds.size === 0) return;
        
        setIsUpdatingBatch(true);
        const acronym = user.acronym;
        const selectedIdArray = Array.from(selectedIds);
        
        // Optimistic UI update
        setTests(prev => prev.map(t => {
            if (selectedIds.has(t.id)) {
                const isPending = newResult === 'Pendente';
                return { 
                    ...t, 
                    result: newResult, 
                    analyst: isPending ? '' : acronym 
                };
            }
            return t;
        }));

        try {
            const updates = selectedIdArray.map(id => {
                const isPending = newResult === 'Pendente';
                return supabase
                    .from('excel_test_records')
                    .update({ 
                        result: newResult,
                        analyst: isPending ? '' : acronym,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
            });

            await Promise.all(updates);
            setSelectedIds(new Set());
            setIsActionMenuOpen(false);
        } catch (error) {
            console.error('Error batch updating results:', error);
            alert('Erro ao atualizar registros em lote.');
        } finally {
            setIsUpdatingBatch(false);
        }
    };

    const handleBatchAnalystChange = async (newAnalyst: string) => {
        if (!user || selectedIds.size === 0) return;
        
        setIsUpdatingBatch(true);
        const selectedIdArray = Array.from(selectedIds);
        
        // Optimistic UI update
        setTests(prev => prev.map(t => 
            selectedIds.has(t.id) ? { ...t, analyst: newAnalyst } : t
        ));

        try {
            const updates = selectedIdArray.map(id => 
                supabase
                    .from('excel_test_records')
                    .update({ 
                        analyst: newAnalyst,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
            );

            await Promise.all(updates);
            setSelectedIds(new Set());
            setIsActionMenuOpen(false);
        } catch (error) {
            console.error('Error batch updating analysts:', error);
            alert('Erro ao atualizar analistas em lote.');
        } finally {
            setIsUpdatingBatch(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTests.length && filteredTests.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTests.map(t => t.id)));
        }
    };

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectChange = async (testId: string, field: TestColumnKey, value: string) => {
        if (!user) return;

        // Optimistic update
        setTests(prev => prev.map(t => t.id === testId ? { ...t, [field]: value } : t));

        try {
            const snakeField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            const { error } = await supabase
                .from('excel_test_records')
                .update({ 
                    [snakeField]: value,
                    updated_at: new Date().toISOString()
                })
                .eq('id', testId);

            if (error) throw error;
        } catch (err) {
            console.error(`Error updating field ${field}:`, err);
        }
    };

    const initiateEdit = (test: ExcelTestRecord, key: TestColumnKey) => {
        if (NON_EDITABLE_FIELDS.includes(key)) return;
        
        // Skip prompt for specific fields that use selects
        if (['analyst', 'priority', 'minimum', 'result'].includes(key)) return;

        const oldValue = String((test as any)[key] || '');
        const newValue = window.prompt(`Novo valor para ${COLUMN_LABELS[key]}:`, oldValue);
        
        if (newValue !== null && newValue !== oldValue) {
            setEditState({
                isOpen: true,
                testId: test.id,
                field: key,
                oldValue,
                newValue,
                isSaving: false
            });
        }
    };

    const confirmEdit = async () => {
        if (!user || !editState.testId || !editState.field) return;

        setEditState(prev => ({ ...prev, isSaving: true }));

        try {
            // Map camelCase to snake_case for the database
            const snakeField = editState.field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            
            const { error } = await supabase
                .from('excel_test_records')
                .update({ 
                    [snakeField]: editState.newValue,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editState.testId);

            if (error) throw error;

            // Update local state
            setTests(prev => prev.map(t => 
                t.id === editState.testId 
                    ? { ...t, [editState.field!]: editState.newValue } 
                    : t
            ));

            setEditState({
                isOpen: false,
                testId: null,
                field: null,
                oldValue: '',
                newValue: '',
                isSaving: false
            });
        } catch (error) {
            console.error('Error saving inline edit:', error);
            setEditState(prev => ({ ...prev, isSaving: false }));
            alert('Erro ao salvar alteração. Tente novamente.');
        }
    };

    const handleDirectSave = async () => {
        if (!user || !directEdit.testId || !directEdit.field) return;
        
        const test = tests.find(t => t.id === directEdit.testId);
        const oldValue = test ? String((test as any)[directEdit.field] || '') : '';
        
        if (directEdit.value === oldValue) {
            setDirectEdit({ testId: null, field: null, value: '' });
            return;
        }

        setIsSavingDirect(true);
        try {
            const snakeField = directEdit.field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            
            const { error } = await supabase
                .from('excel_test_records')
                .update({ 
                    [snakeField]: directEdit.value,
                    updated_at: new Date().toISOString()
                })
                .eq('id', directEdit.testId);

            if (error) throw error;

            setTests(prev => prev.map(t => 
                t.id === directEdit.testId 
                    ? { ...t, [directEdit.field!]: directEdit.value } 
                    : t
            ));
        } catch (err) {
            console.error('Error saving direct edit:', err);
        } finally {
            setIsSavingDirect(false);
            setDirectEdit({ testId: null, field: null, value: '' });
        }
    };

    const filterOptions = useMemo(() => {
        const options = {
            backoffice: new Set<string>(),
            priority: new Set<string>(),
            minimum: new Set<string>(),
            module: new Set<string>(),
            useCase: new Set<string>(),
            analyst: new Set<string>(),
            result: new Set<string>()
        };

        tests.forEach(test => {
            if (test.backoffice) options.backoffice.add(test.backoffice);
            if (test.priority) options.priority.add(test.priority);
            if (test.minimum) options.minimum.add(test.minimum);
            if (test.module) options.module.add(test.module);
            if (test.useCase) options.useCase.add(test.useCase);
            if (test.analyst) options.analyst.add(test.analyst);
            if (test.result) options.result.add(test.result);
        });

        return {
            backoffice: Array.from(options.backoffice).sort(),
            priority: Array.from(options.priority).sort(),
            minimum: Array.from(options.minimum).sort(),
            module: Array.from(options.module).sort(),
            useCase: Array.from(options.useCase).sort(),
            analyst: Array.from(options.analyst).sort(),
            result: Array.from(options.result).sort()
        };
    }, [tests]);

    const activeFilterCount = useMemo(() => {
        return (Object.keys(filterState) as Array<keyof FilterState>).reduce((acc, key) => acc + filterState[key].length, 0);
    }, [filterState]);

    const toggleFilter = (field: keyof FilterState, value: string) => {
        setFilterState(prev => {
            const current = [...prev[field]];
            const index = current.indexOf(value);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(value);
            }
            return { ...prev, [field]: current };
        });
    };

    const clearFilters = () => {
        setFilterState(INITIAL_FILTER_STATE);
    };

    const filteredTests = useMemo(() => {
        let result = tests.filter(test => {
            // Search filter
            const searchLower = searchTerm.toLowerCase();
            const searchableFields = [
                test.testId,
                test.module,
                test.useCase,
                test.priority,
                test.analyst,
                test.result
            ];
            const matchesSearch = !searchTerm.trim() || searchableFields.some(field => 
                String(field || '').toLowerCase().includes(searchLower)
            );

            if (!matchesSearch) return false;

            // Advanced filters
            const matchesBackoffice = filterState.backoffice.length === 0 || filterState.backoffice.includes(test.backoffice || '');
            const matchesPriority = filterState.priority.length === 0 || filterState.priority.includes(test.priority || '');
            const matchesMinimum = filterState.minimum.length === 0 || filterState.minimum.includes(test.minimum || '');
            const matchesModule = filterState.module.length === 0 || filterState.module.includes(test.module || '');
            const matchesUseCase = filterState.useCase.length === 0 || filterState.useCase.includes(test.useCase || '');
            const matchesAnalyst = filterState.analyst.length === 0 || filterState.analyst.includes(test.analyst || '');
            const matchesResult = filterState.result.length === 0 || filterState.result.includes(test.result || '');

            return matchesBackoffice && matchesPriority && matchesMinimum && 
                   matchesModule && matchesUseCase && matchesAnalyst && matchesResult;
        });

        // Apply Default Sorting
        // 1. Use Case (A-Z)
        // 2. Module (A-Z)
        // 3. Minimum (Sim > Não)
        // 4. Priority (Alta > Média > Baixa)
        // 5. TAG ID (Numeric extraction)
        return result.sort((a, b) => {
            // Use Case
            const useCaseSort = (a.useCase || '').localeCompare(b.useCase || '');
            if (useCaseSort !== 0) return useCaseSort;

            // Module
            const moduleSort = (a.module || '').localeCompare(b.module || '');
            if (moduleSort !== 0) return moduleSort;

            // Minimum (Sim > Não)
            const minA = getMinimumWeight(a.minimum || '');
            const minB = getMinimumWeight(b.minimum || '');
            if (minA !== minB) return minB - minA;

            // Priority (Alta > Média > Baixa)
            const pA = getPriorityWeight(a.priority || '');
            const pB = getPriorityWeight(b.priority || '');
            if (pA !== pB) return pB - pA;

            // TAG ID (QA-XXXXX)
            const idA = extractTestIdNumber(a.testId || '');
            const idB = extractTestIdNumber(b.testId || '');
            return idA - idB;
        });
    }, [tests, searchTerm, filterState]);

    const visibleTests = useMemo(() => {
        return filteredTests.slice(0, visibleCount);
    }, [filteredTests, visibleCount]);

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    // Helper para renderizar um campo apenas se estiver ativado nas configurações
    const renderField = (
        key: TestColumnKey, 
        test: ExcelTestRecord,
        renderCustom?: (val: string) => React.ReactNode
    ) => {
        // Essential fields might be forced to show, but per requirements all are configurable
        if (!testColumnSettings[key]) return null;
        
        const label = COLUMN_LABELS[key];
        const value = (test as any)[key] as string | undefined;
        const displayValue = value || '--';
        const isEditable = !NON_EDITABLE_FIELDS.includes(key);
        // Fields that use direct select (no modal)
        const isSelectField = ['analyst', 'priority', 'minimum', 'result'].includes(key);

        return (
            <div 
                className={`flex flex-col group/field transition-all ${isEditable && !isSelectField ? 'cursor-pointer hover:bg-slate-50 p-1 -m-1 rounded' : 'p-1 -m-1'}`} 
                key={key}
                onClick={(e) => {
                    if (isEditable && !isSelectField) {
                        e.stopPropagation();
                        initiateEdit(test, key);
                    }
                }}
            >
                <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                    {isEditable && !isSelectField && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 opacity-0 group-hover/field:opacity-100 transition-opacity"></div>
                    )}
                </div>
                {renderCustom ? renderCustom(displayValue) : (
                    <span className={`text-sm tracking-tight truncate ${isEditable ? 'text-slate-800' : 'text-slate-500'}`} title={displayValue}>
                        {displayValue}
                    </span>
                )}
            </div>
        );
    };

    // Helper to render complex text fields with direct inline edit
    const renderComplexEditableField = (test: ExcelTestRecord, key: TestColumnKey, icon: React.ReactNode, iconColor: string) => {
        const isEditing = directEdit.testId === test.id && directEdit.field === key;
        const value = (test as any)[key] || '';
        const label = COLUMN_LABELS[key];

        return (
            <div>
                <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-2 uppercase tracking-wide">
                    <div className={`p-1 rounded-md bg-white shadow-sm border border-slate-100`}>
                        {React.cloneElement(icon as React.ReactElement, { className: `w-3.5 h-3.5 ${iconColor}` })}
                    </div>
                    {label}
                    {isSavingDirect && isEditing && (
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-500 ml-auto" />
                    )}
                </h4>
                {isEditing ? (
                    <textarea
                        autoFocus
                        value={directEdit.value}
                        onChange={(e) => setDirectEdit(prev => ({ ...prev, value: e.target.value }))}
                        onBlur={handleDirectSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleDirectSave();
                            }
                        }}
                        className="w-full bg-white p-4 rounded-2xl border-2 border-indigo-500 text-sm text-slate-700 shadow-inner focus:ring-0 outline-none min-h-[120px] transition-all animate-in fade-in zoom-in-95 duration-150"
                    />
                ) : (
                    <div 
                        onClick={() => setDirectEdit({ testId: test.id, field: key, value })}
                        className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group relative overflow-hidden min-h-[60px]"
                    >
                        {value || <span className="italic text-slate-300">Nenhum conteúdo definido. Clique para editar.</span>}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-1 px-2 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">
                                EDITAR
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-8 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 space-y-8">
                {/* Cabeçalho */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-50 rounded-md">
                            <Beaker className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                                Gestão de Testes
                            </h2>
                            <p className="text-sm text-slate-500">
                                {filteredTests.length > 0 
                                    ? `Exibindo ${visibleTests.length} de ${filteredTests.length} casos de teste.` 
                                    : 'Nenhum teste encontrado.'
                                }
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex-1 max-w-md mx-4 hidden md:block">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Pesquisar por TAG, ID, Módulo, Analista..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMetricsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Activity className="w-4 h-4" />
                            Métricas Diárias
                        </button>
                        <button
                            onClick={onOpenSettings}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Settings className="w-4 h-4" />
                            Configurações
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                disabled={selectedIds.size === 0 || isUpdatingBatch}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-sm ${
                                    selectedIds.size > 0 
                                        ? 'bg-amber-500 hover:bg-amber-600' 
                                        : 'bg-slate-300 cursor-not-allowed'
                                }`}
                            >
                                {isUpdatingBatch ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} />
                                )}
                                Ação
                                {selectedIds.size > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                                        {selectedIds.size}
                                    </span>
                                )}
                            </button>

                            {isActionMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alterar Resultado</p>
                                    </div>
                                    {['Pendente', 'Em Andamento', 'Sucesso', 'Erro', 'Impedimento'].map(res => (
                                        <button
                                            key={res}
                                            onClick={() => handleBatchResultChange(res)}
                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                        >
                                            <div className={`w-2 h-2 rounded-full ${
                                                res === 'Sucesso' ? 'bg-emerald-500' :
                                                res === 'Erro' ? 'bg-red-500' :
                                                res === 'Em Andamento' ? 'bg-blue-500' :
                                                res === 'Impedimento' ? 'bg-purple-500' :
                                                'bg-slate-300'
                                            }`} />
                                            {res}
                                        </button>
                                    ))}

                                    <div className="px-4 py-2 border-b border-slate-50 my-1 mt-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transferir Analista</p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {analysts.map(acronym => (
                                            <button
                                                key={acronym}
                                                onClick={() => handleBatchAnalystChange(acronym)}
                                                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                            >
                                                {acronym}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setIsFilterPanelOpen(true)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-sm ${
                                    activeFilterCount > 0 
                                        ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700' 
                                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Filter className={`w-4 h-4 ${activeFilterCount > 0 ? 'text-white' : 'text-slate-500'}`} />
                                Filtro
                                {activeFilterCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Barra de Pesquisa Mobile */}
                <div className="md:hidden pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Pesquisar testes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none shadow-sm"
                        />
                    </div>
                </div>

                {/* Estado Zero */}
                {filteredTests.length === 0 && (
                    <div className="text-center py-16 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">{searchTerm ? 'Nenhum resultado para sua busca' : 'Nenhum teste carregado'}</h3>
                        <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
                            {searchTerm ? 'Tente buscar por TAG ID, Módulo ou Status diferente.' : 'Utilize o botão Configurações no canto superior direito para acessar as ferramentas administrativas e importar sua planilha.'}
                        </p>
                    </div>
                )}

                {/* Lista de Testes */}
                {filteredTests.length > 0 && (
                    <>
                        <div className="space-y-3">
                        {/* Batch Selection Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 mb-4 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-2 group"
                                >
                                    <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                                        selectedIds.size === filteredTests.length && filteredTests.length > 0
                                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                                            : 'bg-white border-slate-300 group-hover:border-indigo-400'
                                    }`}>
                                        {selectedIds.size === filteredTests.length && filteredTests.length > 0 && (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        )}
                                        {selectedIds.size > 0 && selectedIds.size < filteredTests.length && (
                                            <div className="w-2 h-0.5 bg-indigo-500 rounded-full" />
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        {selectedIds.size === filteredTests.length && filteredTests.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </span>
                                </button>
                                {selectedIds.size > 0 && (
                                    <div className="h-4 w-px bg-slate-200 mx-1" />
                                )}
                                {selectedIds.size > 0 && (
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                        {selectedIds.size} SELECIONADOS
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {filteredTests.length} total
                            </p>
                        </div>
                        {visibleTests.map((test) => {
                            const isExpanded = expandedId === test.id;

                            // Determine active header fields to adjust grid columns
                            const headerFields = (testColumnSettings.order || DEFAULT_COLUMN_ORDER).filter((key) => {
                                if (['objective', 'prerequisite', 'stepsText', 'description', 'acceptanceCriteria', 'observation'].includes(key)) {
                                    return false;
                                }
                                return testColumnSettings[key];
                            });

                            // Map number of fields to a tailwind grid class
                            let gridColsClass = 'lg:grid-cols-6';
                            if (headerFields.length <= 2) gridColsClass = 'lg:grid-cols-2';
                            else if (headerFields.length === 3) gridColsClass = 'lg:grid-cols-3';
                            else if (headerFields.length === 4) gridColsClass = 'lg:grid-cols-4';
                            else if (headerFields.length === 5) gridColsClass = 'lg:grid-cols-5';
                            else if (headerFields.length === 6) gridColsClass = 'lg:grid-cols-6';
                            else if (headerFields.length === 7) gridColsClass = 'lg:grid-cols-7';
                            else if (headerFields.length === 8) gridColsClass = 'lg:grid-cols-8';
                            else if (headerFields.length === 9) gridColsClass = 'lg:grid-cols-9';
                            else if (headerFields.length === 10) gridColsClass = 'lg:grid-cols-10';
                            else if (headerFields.length === 11) gridColsClass = 'lg:grid-cols-11';
                            else if (headerFields.length >= 12) gridColsClass = 'lg:grid-cols-12';

                            return (
                                <div key={test.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow transition-shadow">
                                    {/* Cabeçalho do Card */}
                                    <div
                                        className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                        onClick={() => toggleExpand(test.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Checkbox Individual */}
                                            <div
                                                onClick={(e) => toggleSelect(test.id, e)}
                                                className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center shrink-0 ${
                                                    selectedIds.has(test.id)
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                        : 'bg-white border-slate-200 hover:border-indigo-300'
                                                }`}
                                            >
                                                {selectedIds.has(test.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </div>

                                            <div className="flex flex-col gap-1 min-w-[120px]">
                                                <div className="flex items-center gap-2">
                                                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span className="text-xs font-black text-indigo-600 tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                        {test.tagId}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-5">TAG ID</span>
                                            </div>
                                        </div>

                                        <div className={`flex-1 grid grid-cols-2 ${gridColsClass} gap-4 items-center`}>
                                            {/* Render Dynamic Header Fields Based on User Order Configuration */}
                                            {(testColumnSettings.order || DEFAULT_COLUMN_ORDER).map((key) => {
                                                // Exclude fields intended for the expanded view
                                                if (['objective', 'prerequisite', 'stepsText', 'description', 'acceptanceCriteria', 'observation'].includes(key)) {
                                                    return null;
                                                }

                                                const columnKey = key as TestColumnKey;

                                                // Custom render for Analyst
                                                if (columnKey === 'analyst') {
                                                    if (!testColumnSettings.analyst) return null;
                                                    return renderField('analyst', test, (val) => (
                                                        <select
                                                            onClick={e => e.stopPropagation()}
                                                            value={val || ''}
                                                            onChange={(e) => handleSelectChange(test.id, 'analyst', e.target.value)}
                                                            className="block w-full text-xs font-semibold rounded border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-0.5 pl-2 pr-6 appearance-none cursor-pointer transition-colors m-0 bg-slate-50 text-slate-700"
                                                        >
                                                            <option value="">--</option>
                                                            {analysts.map(acronym => (
                                                                <option key={acronym} value={acronym}>{acronym}</option>
                                                            ))}
                                                        </select>
                                                    ));
                                                }

                                                // Custom render for Priority
                                                if (columnKey === 'priority') {
                                                    if (!testColumnSettings.priority) return null;
                                                    return renderField('priority', test, (val) => {
                                                        const cleanVal = (val || 'Média').trim();
                                                        let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'; // Normal/Média
                                                        if (cleanVal.toLowerCase().includes('alta')) colorClass = 'bg-red-50 text-red-700 border-red-200';
                                                        if (cleanVal.toLowerCase().includes('baixa')) colorClass = 'bg-blue-50 text-blue-700 border-blue-200';

                                                        return (
                                                            <select
                                                                onClick={e => e.stopPropagation()}
                                                                value={val || 'Média'}
                                                                onChange={(e) => handleSelectChange(test.id, 'priority', e.target.value)}
                                                                className={`block w-full text-xs font-bold rounded border shadow-sm focus:ring-indigo-500 py-0.5 pl-2 pr-6 appearance-none cursor-pointer transition-colors m-0 ${colorClass}`}
                                                            >
                                                                <option value="Alta">Alta</option>
                                                                <option value="Média">Média</option>
                                                                <option value="Baixa">Baixa</option>
                                                            </select>
                                                        );
                                                    });
                                                }

                                                // Custom render for Minimum (Sim/Não)
                                                if (columnKey === 'minimum') {
                                                    if (!testColumnSettings.minimum) return null;
                                                    return renderField('minimum', test, (val) => {
                                                        const isSim = val === 'Sim';
                                                        const colorClass = isSim
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-orange-50 text-orange-700 border-orange-200';

                                                        return (
                                                            <select
                                                                onClick={e => e.stopPropagation()}
                                                                value={val || 'Não'}
                                                                onChange={(e) => handleSelectChange(test.id, 'minimum', e.target.value)}
                                                                className={`block w-full text-xs font-black rounded border shadow-sm focus:ring-indigo-500 py-0.5 pl-2 pr-6 appearance-none cursor-pointer transition-colors m-0 ${colorClass}`}
                                                            >
                                                                <option value="Sim">Sim</option>
                                                                <option value="Não">Não</option>
                                                            </select>
                                                        );
                                                    });
                                                }

                                                // Custom render for Result Dropdown
                                                if (columnKey === 'result') {
                                                    if (!testColumnSettings.result) return null; // Respect visibility setting
                                                    return renderField('result', test, (val) => (
                                                        <select
                                                            onClick={e => e.stopPropagation()}
                                                            value={val || 'Pendente'}
                                                            onChange={(e) => handleResultChange(test.id, e.target.value)}
                                                            className={`block w-full text-xs font-semibold rounded border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-0.5 pl-2 pr-6 appearance-none cursor-pointer transition-colors m-0 ${
                                                                val === 'Sucesso' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                val === 'Erro' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                val === 'Em Andamento' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                val === 'Impedimento' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                'bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}
                                                        >
                                                            <option value="Pendente">Pendente</option>
                                                            <option value="Em Andamento">Em Andamento</option>
                                                            <option value="Sucesso">Sucesso</option>
                                                            <option value="Erro">Erro</option>
                                                            <option value="Impedimento">Impedimento</option>
                                                        </select>
                                                    ));
                                                }

                                                // Default field render
                                                return renderField(columnKey, test);
                                            })}
                                        </div>

                                        <div className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 shrink-0">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                    </div>

                                    {/* Conteúdo Expandido - Complex Text Fields */}
                                    {isExpanded && (
                                        <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Coluna Esquerda */}
                                            <div className="space-y-6">
                                                {renderComplexEditableField(test, 'objective', <ShieldAlert />, 'text-indigo-500')}
                                                {renderComplexEditableField(test, 'prerequisite', <AlertCircle />, 'text-amber-500')}

                                                {testColumnSettings.stepsText && (
                                                    <div>
                                                        <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-2 uppercase tracking-wide">
                                                            <div className="p-1 rounded-md bg-white shadow-sm border border-slate-100">
                                                                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                                                            </div>
                                                            {COLUMN_LABELS.stepsText}
                                                        </h4>
                                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap">
                                                            {test.stepsText || 'N/A'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Coluna Direita */}
                                            <div className="space-y-6">
                                                {renderComplexEditableField(test, 'description', <FileSpreadsheet />, 'text-indigo-500')}
                                                {renderComplexEditableField(test, 'acceptanceCriteria', <CheckCircle2 />, 'text-emerald-500')}

                                                {testColumnSettings.observation && (
                                                    <div>
                                                        <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-2 uppercase tracking-wide">
                                                            <div className="p-1 rounded-md bg-white shadow-sm border border-slate-100">
                                                                <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                                                            </div>
                                                            {COLUMN_LABELS.observation}
                                                        </h4>
                                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap">
                                                            {test.observation || 'N/A'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Load More Button */}
                        {visibleCount < filteredTests.length && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 50)}
                                    className="group flex items-center gap-3 px-8 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-600 font-bold hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95"
                                >
                                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                    Carregar mais itens
                                    <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-400 text-[10px] rounded-full transition-colors">
                                        {filteredTests.length - visibleCount} restantes
                                    </span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <DailyMetricsModal
                isOpen={isMetricsModalOpen}
                onClose={() => setIsMetricsModalOpen(false)}
                user={user}
            />

            <ConfirmEditModal 
                isOpen={editState.isOpen}
                onClose={() => setEditState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmEdit}
                fieldName={editState.field ? COLUMN_LABELS[editState.field] : ''}
                oldValue={editState.oldValue}
                newValue={editState.newValue}
                isSaving={editState.isSaving}
            />

            <TestFilterModal 
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                onApply={(filters) => {
                    setFilterState(filters);
                    setIsFilterPanelOpen(false);
                }}
                onClear={clearFilters}
                filterOptions={filterOptions}
                initialFilters={filterState}
            />
        </div>
    );
};

export default TestManagement;
