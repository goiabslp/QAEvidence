import React, { useState, useEffect, useMemo } from 'react';
import { Beaker, Settings, ChevronDown, ChevronUp, AlertCircle, FileSpreadsheet, CheckCircle2, ShieldAlert, Activity, Search, Target, RefreshCw, Filter, X, Loader2, MessageSquare } from 'lucide-react';
import { ExcelTestRecord, TestColumnSettings, DEFAULT_COLUMN_SETTINGS, DEFAULT_COLUMN_ORDER, TestColumnKey } from '../../../types';
import { COLUMN_LABELS } from './TestSettings';
import ConfirmEditModal from './ConfirmEditModal';
import DailyMetricsModal from './DailyMetricsModal';
import TestFilterModal from './TestFilterModal';
import ManualTestModal from './ManualTestModal';
import { User } from '../../../types';
import { supabase } from '@/services/supabaseClient';
import { FilterState, INITIAL_FILTER_STATE, StructuredObservation } from '../../../types';
import ModernSelect from '../../common/ModernSelect';
import TestObservationModal from './TestObservationModal';
import ActionMenuModal from './ActionMenuModal';

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
    onUpdateUser?: (user: User) => void;
}

const TestManagement: React.FC<TestManagementProps> = ({ 
    onOpenSettings,
    testColumnSettings: propTestColumnSettings,
    user,
    onUpdateUser
}) => {
    const testColumnSettings = propTestColumnSettings || DEFAULT_COLUMN_SETTINGS;
    const [tests, setTests] = useState<ExcelTestRecord[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sheetName, setSheetName] = useState('Gestão de Testes');

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
    const [analysts, setAnalysts] = useState<{acronym: string, name: string}[]>([]);

    // Batch Action State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);
    const [batchEditState, setBatchEditState] = useState<{
        isOpen: boolean;
        field: TestColumnKey | null;
        newValue: string;
        isSaving: boolean;
    }>({
        isOpen: false,
        field: null,
        newValue: '',
        isSaving: false
    });

    // Filter State
    const [filterState, setFilterState] = useState<FilterState>(() => {
        if (user?.testFilters) return user.testFilters;
        return INITIAL_FILTER_STATE;
    });
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(50);
    const [isLoadingTests, setIsLoadingTests] = useState(false);

    // Observation Modal State
    const [observationModal, setObservationModal] = useState<{
        isOpen: boolean;
        testId: string | null;
        initialValue: string;
        isMandatory: boolean;
        status: string;
    }>({
        isOpen: false,
        testId: null,
        initialValue: '',
        isMandatory: false,
        status: ''
    });

    const handleCreateTest = async (testData: Partial<ExcelTestRecord>) => {
        if (!user) return;
        try {
            const snakeCaseData: any = {};
            for (const [key, value] of Object.entries(testData)) {
                if (key === 'id') continue;
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                snakeCaseData[snakeKey] = value;
            }
            if (!snakeCaseData.tag_id && snakeCaseData.test_id) {
                snakeCaseData.tag_id = snakeCaseData.test_id;
            }
            snakeCaseData.created_by = user.id;

            const { error } = await supabase
                .from('excel_test_records')
                .insert([snakeCaseData]);

            if (error) throw error;
            setIsManualModalOpen(false);
        } catch (error) {
            console.error('Error creating manual test:', error);
            alert('Erro ao criar teste manualmente.');
        }
    };

    const handleDeleteTest = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza que deseja excluir este teste?')) return;
        try {
            const { error } = await supabase
                .from('excel_test_records')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setExpandedId(null);
            // WebSocket will update the list
        } catch (error) {
            console.error('Error deleting test:', error);
            alert('Erro ao excluir teste.');
        }
    };


    // Sync from user prop on load if it becomes available later
    useEffect(() => {
        if (user?.testFilters) {
            setFilterState(user.testFilters);
        }
    }, [user?.testFilters]);

    // Save filters helper
    const saveFiltersToDatabase = async (filters: FilterState) => {
        if (!user?.id) return;
        try {
            await supabase.from('profiles').update({
                test_filters_state: filters
            }).eq('id', user.id);
        } catch (err) {
            console.error('Error saving filters:', err);
        }
    };



    // Fetch analysts list
    useEffect(() => {
        const fetchAnalysts = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('acronym, full_name')
                    .eq('is_active', true)
                    .eq('is_analyst', true)
                    .order('acronym');
                
                if (error) throw error;
                if (data) {
                    setAnalysts(data.map(p => ({ acronym: p.acronym, name: p.full_name })).filter(a => a.acronym && a.acronym !== 'ADM'));
                }
            } catch (err) {
                console.error('Error fetching analysts:', err);
            }
        };
        fetchAnalysts();
    }, []);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set()); // Clear selection on filter/search change
    }, [searchTerm, filterState]);

    // Load tests from Supabase with server-side pagination and filtering
    const fetchTests = async () => {
        if (!user) return;
        setIsLoadingTests(true);
        try {
            let query = supabase
                .from('excel_test_records')
                .select('*', { count: 'exact' })
                .neq('module', 'SYSTEM_SETTINGS');

            // Apply Search filter
            if (searchTerm.trim()) {
                const searchLower = `%${searchTerm.toLowerCase()}%`;
                // Supabase doesn't support easy multi-column OR search across many fields via standard API easily without raw SQL or a dedicated filter string
                // But we can use .or() for common fields
                query = query.or(`test_id.ilike.${searchLower},module.ilike.${searchLower},use_case.ilike.${searchLower},analyst.ilike.${searchLower},backoffice.ilike.${searchLower},tag_id.ilike.${searchLower}`);
            }

            // Apply Advanced filters
            if (filterState.backoffice.length > 0) query = query.in('backoffice', filterState.backoffice);
            if (filterState.priority.length > 0) query = query.in('priority', filterState.priority);
            if (filterState.minimum.length > 0) query = query.in('minimum', filterState.minimum);
            if (filterState.module.length > 0) query = query.in('module', filterState.module);
            if (filterState.useCase.length > 0) query = query.in('use_case', filterState.useCase);
            if (filterState.analyst.length > 0) query = query.in('analyst', filterState.analyst);
            if (filterState.result.length > 0) query = query.in('result', filterState.result);

            // Sorting (matching the logic requested before)
            query = query
                .order('use_case', { ascending: true })
                .order('module', { ascending: true })
                .order('priority', { ascending: true }) // Note: DB sorting might differ from custom weight sorting but ilike order is usually fine
                .order('tag_id', { ascending: true });

            // Pagination
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;
            
            const { data, count, error } = await query.range(from, to);

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
                })) as ExcelTestRecord[];
                
                setTests(mappedTests);
                if (count !== null) setTotalCount(count);

                // Fetch sheet name (separate one-off query if needed, or get from a specific setting record)
                if (currentPage === 1 && !searchTerm.trim()) {
                    const { data: settingsData } = await supabase
                        .from('excel_test_records')
                        .select('steps_text')
                        .eq('module', 'SYSTEM_SETTINGS')
                        .maybeSingle();
                    
                    if (settingsData) {
                        setSheetName(settingsData.steps_text || 'Gestão de Testes');
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setIsLoadingTests(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, [user, currentPage, filterState, searchTerm, isMetricsModalOpen]);

    // Realtime Subscription
    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('excel_test_records_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'excel_test_records'
                },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        setTotalCount(prev => Math.max(0, prev - 1));
                        setTests(currentTests => currentTests.filter(t => t.id !== payload.old.id));
                        return;
                    }

                    const record = payload.new;
                    
                    if (record.module === 'SYSTEM_SETTINGS') {
                        setSheetName(record.steps_text || 'Gestão de Testes');
                        return;
                    }

                    const mappedTest = {
                        id: record.id,
                        stepsText: record.steps_text,
                        browser: record.browser,
                        bank: record.bank,
                        backoffice: record.backoffice,
                        mobile: record.mobile,
                        analyst: record.analyst,
                        automated: record.automated,
                        bcsCode: record.bcs_code,
                        useCase: record.use_case,
                        minimum: record.minimum,
                        priority: record.priority,
                        testId: record.test_id,
                        module: record.module,
                        objective: record.objective,
                        estimatedTime: record.estimated_time,
                        prerequisite: record.prerequisite,
                        description: record.description,
                        acceptanceCriteria: record.acceptance_criteria,
                        result: record.result,
                        errorStatus: record.error_status,
                        observation: record.observation,
                        gap: record.gap,
                        tagId: record.tag_id
                    };

                    if (payload.eventType === 'INSERT') {
                        setTotalCount(prev => prev + 1);
                        
                        // Only add to the current view if we are on the first page
                        // and it matches basic search criteria (if any)
                        if (currentPage === 1) {
                            setTests(currentTests => {
                                const newTests = [{ ...mappedTest } as ExcelTestRecord, ...currentTests];
                                return newTests.slice(0, pageSize);
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setTests(currentTests => {
                            const exists = currentTests.some(t => t.id === mappedTest.id);
                            if (exists) {
                                return currentTests.map(t => {
                                    if (t.id === mappedTest.id) {
                                        // Use Object.entries to only override with defined/updated fields from payload.new
                                        const cleanMapped = Object.fromEntries(Object.entries(mappedTest).filter(([_, v]) => v !== undefined));
                                        return { ...t, ...cleanMapped } as ExcelTestRecord;
                                    }
                                    return t;
                                });
                            }
                            return currentTests;
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Helper to push updates to Google Sheets in background
    const pushToGoogleSheets = async (updatesArray: { tagId: string, updates: any }[]) => {
        try {
            await supabase.functions.invoke('google-sheets-sync?action=push_batch', {
                method: 'POST',
                body: { updatesArray }
            });
        } catch (e) {
            console.error("Failed to push to Google Sheets", e);
        }
    };

    const handleResultChange = async (testId: string, newResult: string) => {
        if (!user) return;
        
        const isPending = newResult === 'Pendente';
        const newAnalyst = isPending ? '' : `${user.acronym} - ${user.name}`;

        // Optimistic UI update
        setTests(prev => prev.map(t => 
            t.id === testId 
                ? { ...t, result: newResult, analyst: newAnalyst } 
                : t
        ));
        setAllFiltersData(prev => prev.map(t => 
            t.id === testId 
                ? { ...t, result: newResult, analyst: newAnalyst } 
                : t
        ));

        // If status is Erro or Impedimento, we need a mandatory observation
        if (newResult === 'Erro' || newResult === 'Impedimento') {
            const test = tests.find(t => t.id === testId);
            setObservationModal({
                isOpen: true,
                testId,
                initialValue: test?.observation || '',
                isMandatory: true,
                status: newResult
            });
            return;
        }

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
            
            // Push to Google Sheets
            const targetTest = tests.find(t => t.id === testId);
            if (targetTest?.test_id) {
                pushToGoogleSheets([{ tagId: targetTest.test_id, updates: { result: newResult, analyst: newAnalyst } }]);
            }
        } catch (error) {
            console.error('Error updating test result:', error);
            // Could revert UI here on fail
        }
    };

    const handleSaveObservation = async (observationText: string) => {
        if (!user || !observationModal.testId) return;

        const testId = observationModal.testId;
        const newResult = observationModal.status || tests.find(t => t.id === testId)?.result || 'Pendente';
        const isPending = newResult === 'Pendente';
        const newAnalyst = isPending ? '' : user.acronym;

        // Create structured observation
        const newObs: StructuredObservation = {
            text: observationText,
            userAcronym: user.acronym,
            userName: user.name,
            timestamp: new Date().toISOString()
        };

        // Fetch current observation to append if it's already structured
        let currentObs: any[] = [];
        const test = tests.find(t => t.id === testId);
        if (test?.observation?.startsWith('[') && test?.observation?.endsWith(']')) {
            try {
                currentObs = JSON.parse(test.observation);
            } catch (e) {}
        }

        const updatedObs = [...currentObs, newObs];
        const serializedObs = JSON.stringify(updatedObs);

        // Optimistic UI update
        setTests(prev => prev.map(t => 
            t.id === testId 
                ? { ...t, result: newResult, analyst: newAnalyst, observation: serializedObs } 
                : t
        ));
        setAllFiltersData(prev => prev.map(t => 
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
                    observation: serializedObs,
                    updated_at: new Date().toISOString()
                })
                .eq('id', testId);

            if (error) throw error;
            
            // Push to Google Sheets
            const targetTest = tests.find(t => t.id === testId);
            if (targetTest?.test_id) {
                pushToGoogleSheets([{ tagId: targetTest.test_id, updates: { result: newResult, analyst: newAnalyst, observation: serializedObs } }]);
            }
        } catch (error) {
            console.error('Error saving observation:', error);
            alert('Erro ao salvar observação.');
        } finally {
            setObservationModal(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleBatchResultChange = async (newResult: string) => {
        if (!user || selectedIds.size === 0) return;
        
        setIsUpdatingBatch(true);
        const newAnalystStr = `${user.acronym} - ${user.name}`;
        const selectedIdArray = Array.from(selectedIds);
        
        // Optimistic UI update
        setTests(prev => prev.map(t => {
            if (selectedIds.has(t.id)) {
                const isPending = newResult === 'Pendente';
                return { 
                    ...t, 
                    result: newResult, 
                    analyst: isPending ? '' : newAnalystStr 
                };
            }
            return t;
        }));
        setAllFiltersData(prev => prev.map(t => {
            if (selectedIds.has(t.id)) {
                const isPending = newResult === 'Pendente';
                return { 
                    ...t, 
                    result: newResult, 
                    analyst: isPending ? '' : newAnalystStr 
                };
            }
            return t;
        }));

        try {
            const updatesArray: any[] = [];
            const isPending = newResult === 'Pendente';
            
            const updates = selectedIdArray.map(id => {
                const targetTest = tests.find(t => t.id === id);
                if (targetTest?.test_id) {
                    updatesArray.push({ tagId: targetTest.test_id, updates: { result: newResult, analyst: isPending ? '' : newAnalystStr } });
                }
                
                return supabase
                    .from('excel_test_records')
                    .update({ 
                        result: newResult,
                        analyst: isPending ? '' : newAnalystStr,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
            });

            await Promise.all(updates);
            
            if (updatesArray.length > 0) {
                pushToGoogleSheets(updatesArray);
            }
            
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
        setAllFiltersData(prev => prev.map(t => 
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

    const confirmBatchEdit = async () => {
        if (!user || selectedIds.size === 0 || !batchEditState.field) return;
        
        setBatchEditState(prev => ({ ...prev, isSaving: true }));
        const selectedIdArray = Array.from(selectedIds);
        const fieldName = batchEditState.field;
        const newValue = batchEditState.newValue;

        // Optimistic UI update
        setTests(prev => prev.map(t => 
            selectedIds.has(t.id) ? { ...t, [fieldName]: newValue } : t
        ));
        const snakeField = fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        setAllFiltersData(prev => prev.map(t => 
            selectedIds.has(t.id) ? { ...t, [snakeField]: newValue } : t
        ));

        try {
            const snakeField = fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            
            const updates = selectedIdArray.map(id => 
                supabase
                    .from('excel_test_records')
                    .update({ 
                        [snakeField]: newValue,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
            );

            await Promise.all(updates);
            setSelectedIds(new Set());
            setBatchEditState({ isOpen: false, field: null, newValue: '', isSaving: false });
        } catch (error) {
            console.error('Error batch updating field:', error);
            alert('Erro ao atualizar campos em lote.');
            setBatchEditState(prev => ({ ...prev, isSaving: false }));
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === tests.length && tests.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tests.map(t => t.id)));
        }
    };

    const handleSelectAllFiltered = () => {
        if (!allFiltersData.length) return;

        let filtered = allFiltersData;

        // Apply Search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                (item.test_id && item.test_id.toLowerCase().includes(searchLower)) ||
                (item.module && item.module.toLowerCase().includes(searchLower)) ||
                (item.use_case && item.use_case.toLowerCase().includes(searchLower)) ||
                (item.analyst && item.analyst.toLowerCase().includes(searchLower)) ||
                (item.backoffice && item.backoffice.toLowerCase().includes(searchLower)) ||
                (item.tag_id && item.tag_id.toLowerCase().includes(searchLower))
            );
        }

        // Apply Advanced filters
        if (filterState.backoffice.length > 0) filtered = filtered.filter(item => filterState.backoffice.includes(item.backoffice));
        if (filterState.priority.length > 0) filtered = filtered.filter(item => filterState.priority.includes(item.priority));
        if (filterState.minimum.length > 0) filtered = filtered.filter(item => filterState.minimum.includes(item.minimum));
        if (filterState.module.length > 0) filtered = filtered.filter(item => filterState.module.includes(item.module));
        if (filterState.useCase.length > 0) filtered = filtered.filter(item => filterState.useCase.includes(item.use_case));
        if (filterState.analyst.length > 0) filtered = filtered.filter(item => filterState.analyst.includes(item.analyst));
        if (filterState.result.length > 0) filtered = filtered.filter(item => filterState.result.includes(item.result));

        const allIds = filtered.map(item => item.id);
        
        if (selectedIds.size === allIds.length && allIds.length > 0) {
            setSelectedIds(new Set()); // Deselect all if they are all selected
        } else {
            setSelectedIds(new Set(allIds)); // Select all filtered
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
        const snakeField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        setAllFiltersData(prev => prev.map(t => t.id === testId ? { ...t, [snakeField]: value } : t));

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
        
        setEditState({
            isOpen: true,
            testId: test.id,
            field: key,
            oldValue,
            newValue: oldValue, // Initialize with oldValue so user can edit it in the modal
            isSaving: false
        });
    };

    const initiateDoubleClickEdit = (test: ExcelTestRecord, key: TestColumnKey) => {
        const allowedFields: TestColumnKey[] = ['module', 'priority', 'backoffice', 'useCase', 'minimum'];
        if (!allowedFields.includes(key)) return;

        const oldValue = String((test as any)[key] || '');
        
        setEditState({
            isOpen: true,
            testId: test.id,
            field: key,
            oldValue,
            newValue: oldValue, // Initialize with oldValue so user can edit it in the modal
            isSaving: false
        });
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
            setAllFiltersData(prev => prev.map(t => 
                t.id === editState.testId 
                    ? { ...t, [snakeField]: editState.newValue } 
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
            setAllFiltersData(prev => prev.map(t => 
                t.id === directEdit.testId 
                    ? { ...t, [snakeField]: directEdit.value } 
                    : t
            ));
        } catch (err) {
            console.error('Error saving direct edit:', err);
        } finally {
            setIsSavingDirect(false);
            setDirectEdit({ testId: null, field: null, value: '' });
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    // We need complete filter options for the modal to do dynamic cross-filtering.
    // Fetch all records' filterable columns in the background.
    const [allFiltersData, setAllFiltersData] = useState<any[]>([]);

    useEffect(() => {
        const fetchAllFiltersData = async () => {
            if (!user) return;
            try {
                let allData: any[] = [];
                let hasMore = true;
                let from = 0;
                const limit = 4999; // Request a large chunk, Supabase will cap it to its max_rows (usually 1000 or 3000)

                while (hasMore) {
                    const { data, error } = await supabase
                        .from('excel_test_records')
                        .select('id, test_id, tag_id, backoffice, priority, minimum, module, use_case, analyst, result')
                        .neq('module', 'SYSTEM_SETTINGS')
                        .range(from, from + limit);

                    if (error) throw error;

                    if (data && data.length > 0) {
                        allData = [...allData, ...data];
                        from += data.length;
                        
                        // If the returned length is less than requested and not neatly a multiple of 1000
                        // (which is a common max_rows), it's highly likely it's the last page.
                        // But to be perfectly safe, we stop when it's 0 or strictly less than max_rows if we know it.
                        // We'll just stop if data.length === 0 or if it returned less than 1000 (assuming 1000 is the min cap)
                        if (data.length < 1000) {
                            hasMore = false;
                        }
                    } else {
                        hasMore = false;
                    }
                }

                setAllFiltersData(allData);
            } catch (err) {
                console.error('Error fetching all filters data:', err);
            }
        };
        fetchAllFiltersData();
    }, [user]);

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
        const reset = {
            backoffice: [],
            priority: [],
            minimum: [],
            module: [],
            useCase: [],
            analyst: [],
            result: []
        };
        setFilterState(reset);
        saveFiltersToDatabase(reset);
        setCurrentPage(1);
    };

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
        const isDoubleClickEditable = ['module', 'priority', 'backoffice', 'useCase', 'minimum'].includes(key);

        return (
            <div 
                className={`flex flex-col group/field transition-all ${(isEditable && !isSelectField) || isDoubleClickEditable ? 'cursor-pointer hover:bg-slate-50 p-1 -m-1 rounded' : 'p-1 -m-1'}`} 
                key={key}
                onClick={(e) => {
                    if (isEditable && !isSelectField) {
                        e.stopPropagation();
                        initiateEdit(test, key);
                    }
                }}
                onDoubleClick={(e) => {
                    if (isDoubleClickEditable) {
                        e.stopPropagation();
                        initiateDoubleClickEdit(test, key);
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
                    <span className={`text-sm tracking-tight ${['module', 'useCase'].includes(key) ? 'break-words whitespace-normal' : 'truncate'} ${isEditable ? 'text-slate-800' : 'text-slate-500'}`} title={displayValue}>
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

    const spreadsheetAnalystsOptions = React.useMemo(() => {
        const uniqueAnalysts = Array.from(new Set(allFiltersData.map(t => t.analyst).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        return uniqueAnalysts.map(raw => {
            const acronym = raw.includes('-') ? raw.split('-')[0].trim() : raw.substring(0, 3).toUpperCase();
            return { value: raw, label: acronym };
        });
    }, [allFiltersData]);

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
                                {sheetName}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {totalCount > 0 
                                    ? `Exibindo ${tests.length} de ${totalCount} casos de teste.` 
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
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsManualModalOpen(true)}
                            className="flex items-center justify-center px-4 py-2 text-lg font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            title="Novo Teste"
                        >
                            <span className="leading-none">+</span>
                        </button>


                        <div className="relative">
                            <button
                                onClick={() => setIsFilterPanelOpen(true)}
                                className={`flex items-center justify-center p-2.5 rounded-lg transition-all shadow-sm ${
                                    activeFilterCount > 0 
                                        ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700' 
                                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                                title="Filtros"
                            >
                                <Filter className={`w-4 h-4 ${activeFilterCount > 0 ? 'text-white' : 'text-slate-500'}`} />
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-2 -right-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold shadow-sm border border-white text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div>
                            <button
                                onClick={() => setIsActionMenuOpen(true)}
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
                            </button>
                        </div>

                        <button
                            onClick={() => setIsMetricsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
                            title="Métricas Diárias"
                        >
                            <Activity className="w-4 h-4" />
                            Métricas
                        </button>

                        <button
                            onClick={onOpenSettings}
                            className="flex items-center justify-center p-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            title="Configurações"
                        >
                            <Settings className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>
                {/* Estado Zero / Loading */}
                {isLoadingTests && tests.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">Carregando testes...</h3>
                        <p className="text-slate-500">Buscando os registros no servidor.</p>
                    </div>
                )}
                {/* Lista de Testes */}
                {totalCount > 0 && (
                    <>
                        <div className={`space-y-3 ${isLoadingTests ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-300`}>
                        {/* Batch Selection Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 mb-4 sticky top-12 z-40 shadow-sm">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-2 group"
                                >
                                    <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                                        selectedIds.size === tests.length && tests.length > 0
                                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                                            : 'bg-white border-slate-300 group-hover:border-indigo-400'
                                    }`}>
                                        {selectedIds.size === tests.length && tests.length > 0 && (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        )}
                                        {selectedIds.size > 0 && selectedIds.size < tests.length && (
                                            <div className="w-2 h-0.5 bg-indigo-500 rounded-full" />
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        {selectedIds.size === tests.length && tests.length > 0 ? 'Desmarcar Página' : 'Selecionar Página'}
                                    </span>
                                </button>
                                
                                <button
                                    onClick={handleSelectAllFiltered}
                                    className="flex items-center gap-2 group"
                                    title="Seleciona todos os registros que correspondem ao filtro atual em todas as páginas"
                                >
                                    <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                                        selectedIds.size === totalCount && totalCount > 0
                                            ? 'bg-amber-500 border-amber-500 text-white' 
                                            : 'bg-white border-slate-300 group-hover:border-amber-400'
                                    }`}>
                                        {selectedIds.size === totalCount && totalCount > 0 && (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        )}
                                        {selectedIds.size > tests.length && selectedIds.size < totalCount && (
                                            <div className="w-2 h-0.5 bg-amber-400 rounded-full" />
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                        {selectedIds.size === totalCount && totalCount > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </span>
                                </button>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded border border-slate-200 shadow-sm flex items-center gap-3">
                                <span className={selectedIds.size > 0 ? 'text-indigo-600 font-bold' : ''}>{selectedIds.size} SELECIONADOS</span>
                                <span className="opacity-30">|</span>
                                <span>{totalCount} REGISTROS TOTAIS</span>
                            </div>
                        </div>
                        {tests.map((test) => {
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
                                <div key={test.id} className="border border-slate-200 rounded-xl overflow-visible bg-white shadow-sm hover:shadow transition-shadow relative z-0 hover:z-30 focus-within:z-30">
                                    {/* Visual Status Bar */}
                                    {test.result && test.result !== 'Pendente' && (
                                        <div className={`absolute left-0 top-[-1px] bottom-[-1px] w-1.5 rounded-l-xl z-10 ${
                                            test.result === 'Sucesso' ? 'bg-emerald-500' :
                                            test.result === 'Erro' ? 'bg-red-500' :
                                            test.result === 'Em Andamento' ? 'bg-blue-500' :
                                            test.result === 'Impedimento' ? 'bg-purple-500' : ''
                                        }`} />
                                    )}
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

                                                // Custom render for Module
                                                if (columnKey === 'module') {
                                                    if (!testColumnSettings.module) return null;
                                                    return renderField('module', test, (val) => {
                                                        const fullText = val || '--';
                                                        let shortText = fullText;
                                                        
                                                        // Abbreviations logic: take up to ' - ' or first word
                                                        if (fullText.includes(' - ')) {
                                                            shortText = fullText.split(' - ')[0].trim();
                                                        } else if (fullText.includes('-')) {
                                                            shortText = fullText.split('-')[0].trim();
                                                        }
                                                        
                                                        const isAbridged = shortText !== fullText;

                                                        return (
                                                         <div className="relative group/tooltip flex items-center min-w-0">
                                                            <span className={`text-sm tracking-tight truncate whitespace-nowrap text-slate-800 ${isAbridged ? 'cursor-help border-b border-dashed border-slate-300' : ''}`} title={!isAbridged ? fullText : undefined}>
                                                                {shortText}
                                                            </span>
                                                            {/* Tooltip */}
                                                            {fullText && fullText !== '--' && (
                                                                <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-max opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 ease-out translate-y-1 group-hover/tooltip:translate-y-0 z-[120] px-3.5 py-2 bg-[#1e2330] text-slate-50 text-[11px] uppercase tracking-wide font-bold rounded shadow-xl ring-1 ring-black/5 whitespace-nowrap">
                                                                    {fullText}
                                                                    <div className="absolute top-full left-6 -translate-x-1/2 border-[5px] border-transparent border-t-[#1e2330]" />
                                                                </div>
                                                            )}
                                                         </div>
                                                        );
                                                    });
                                                }

                                                // Custom render for Use Case
                                                if (columnKey === 'useCase') {
                                                    if (!testColumnSettings.useCase) return null;
                                                    return renderField('useCase', test, (val) => {
                                                        const fullText = val || '--';
                                                        let shortText = fullText;
                                                        
                                                        // Abbreviations logic: take up to ' - ' or first word
                                                        if (fullText.includes(' - ')) {
                                                            shortText = fullText.split(' - ')[0].trim();
                                                        } else if (fullText.includes('-')) {
                                                            shortText = fullText.split('-')[0].trim();
                                                        }
                                                        
                                                        const isAbridged = shortText !== fullText;

                                                        return (
                                                         <div className="relative group/tooltip flex items-center min-w-0">
                                                            <span className={`text-sm font-bold tracking-tight truncate whitespace-nowrap text-slate-900 ${isAbridged ? 'cursor-help border-b border-dashed border-slate-300' : ''}`} title={!isAbridged ? fullText : undefined}>
                                                                {shortText}
                                                            </span>
                                                            {/* Tooltip */}
                                                            {fullText && fullText !== '--' && (
                                                                <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-max opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 ease-out translate-y-1 group-hover/tooltip:translate-y-0 z-[120] px-3.5 py-2 bg-[#1e2330] text-slate-50 text-[11px] uppercase tracking-wide font-bold rounded shadow-xl ring-1 ring-black/5 whitespace-nowrap">
                                                                    {fullText}
                                                                    <div className="absolute top-full left-6 -translate-x-1/2 border-[5px] border-transparent border-t-[#1e2330]" />
                                                                </div>
                                                            )}
                                                         </div>
                                                        );
                                                    });
                                                }

                                                // Custom render for Backoffice (TAGs)
                                                if (columnKey === 'backoffice') {
                                                    if (!testColumnSettings.backoffice) return null;
                                                    return renderField('backoffice', test, (val) => {
                                                        const cleanVal = (val || '').trim();
                                                        let tagColorClass = 'bg-slate-100 text-slate-600 border-slate-200'; // Default
                                                        
                                                        if (cleanVal === 'SISJURI v11') {
                                                            tagColorClass = 'bg-amber-100 text-amber-700 border-amber-200';
                                                        } else if (cleanVal === 'SISJURI v12') {
                                                            tagColorClass = 'bg-purple-100 text-purple-700 border-purple-200';
                                                        }

                                                        return (
                                                            <div className="flex">
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${tagColorClass} uppercase tracking-tighter`}>
                                                                    {cleanVal || '--'}
                                                                </span>
                                                            </div>
                                                        );
                                                    });
                                                }

                                                // Custom render for Analyst
                                                if (columnKey === 'analyst') {
                                                    if (!testColumnSettings.analyst) return null;
                                                    return renderField('analyst', test, (val) => {
                                                        const tooltipName = val; // val is already exactly as typed in the sheets
                                                        return (
                                                         <div className="relative group/tooltip flex items-center w-fit">
                                                            <ModernSelect
                                                                value={val || ''}
                                                                field="analyst"
                                                                placeholder="--"
                                                                options={spreadsheetAnalystsOptions}
                                                                onChange={(newVal) => handleSelectChange(test.id, 'analyst', newVal)}
                                                            />
                                                            {/* Tooltip */}
                                                            {val && val.trim() !== '' && (
                                                                <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-max opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 ease-out translate-y-1 group-hover/tooltip:translate-y-0 z-[120] px-3.5 py-2 bg-[#1e2330] text-slate-50 text-[11px] uppercase tracking-wide font-bold rounded shadow-xl ring-1 ring-black/5 whitespace-nowrap">
                                                                    {tooltipName}
                                                                    <div className="absolute top-full left-6 -translate-x-1/2 border-[5px] border-transparent border-t-[#1e2330]" />
                                                                </div>
                                                            )}
                                                         </div>
                                                        );
                                                    });
                                                }

                                                // Custom render for Priority
                                                if (columnKey === 'priority') {
                                                    if (!testColumnSettings.priority) return null;
                                                    return renderField('priority', test, (val) => (
                                                        <ModernSelect
                                                            value={val || 'Média'}
                                                            field="priority"
                                                            options={['Alta', 'Média', 'Baixa']}
                                                            onChange={(newVal) => handleSelectChange(test.id, 'priority', newVal)}
                                                        />
                                                    ));
                                                }

                                                // Custom render for Minimum (Sim/Não)
                                                if (columnKey === 'minimum') {
                                                    if (!testColumnSettings.minimum) return null;
                                                    return renderField('minimum', test, (val) => (
                                                        <ModernSelect
                                                            value={val || 'Não'}
                                                            field="minimum"
                                                            options={['Sim', 'Não']}
                                                            onChange={(newVal) => handleSelectChange(test.id, 'minimum', newVal)}
                                                        />
                                                    ));
                                                }

                                                // Custom render for Result Dropdown
                                                if (columnKey === 'result') {
                                                    if (!testColumnSettings.result) return null;
                                                    return renderField('result', test, (val) => (
                                                        <ModernSelect
                                                            value={val || 'Pendente'}
                                                            field="result"
                                                            options={['Pendente', 'Em Andamento', 'Sucesso', 'Erro', 'Impedimento']}
                                                            onChange={(newVal) => handleResultChange(test.id, newVal)}
                                                        />
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
                                        <>
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
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 mb-2 uppercase tracking-wide">
                                                                <div className="p-1 rounded-md bg-white shadow-sm border border-slate-100">
                                                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                                                                </div>
                                                                {COLUMN_LABELS.observation}
                                                            </h4>
                                                            <div className="space-y-3">
                                                                {(() => {
                                                                    if (!test.observation) return <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-400 italic shadow-sm">Nenhuma observação registrada.</div>;
                                                                    
                                                                    if (test.observation.startsWith('[') && test.observation.endsWith(']')) {
                                                                        try {
                                                                            const history = JSON.parse(test.observation) as StructuredObservation[];
                                                                            return history.map((obs, idx) => (
                                                                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                                                                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100">
                                                                                                {obs.userAcronym}
                                                                                            </div>
                                                                                            <span className="text-[10px] font-black text-slate-700 uppercase">{obs.userName}</span>
                                                                                        </div>
                                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                                            {new Date(obs.timestamp).toLocaleString('pt-BR')}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{obs.text}</p>
                                                                                </div>
                                                                            )).reverse();
                                                                        } catch (e) {
                                                                            return <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap">{test.observation}</div>;
                                                                        }
                                                                    }
                                                                    return <div className="bg-white p-4 rounded-2xl border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap">{test.observation}</div>;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="px-5 py-3 bg-red-50/50 border-t border-red-100 flex justify-end">
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setObservationModal({
                                                                isOpen: true,
                                                                testId: test.id,
                                                                initialValue: test.observation || '',
                                                                isMandatory: false,
                                                                status: test.result
                                                            });
                                                        }}
                                                        className="px-4 py-2 text-xs font-bold text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center gap-2 shadow-sm"
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        Observação
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDeleteTest(test.id, e)}
                                                        className="px-4 py-2 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 shadow-sm"
                                                    >
                                                        Excluir Registro
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-12 flex flex-col items-center gap-6">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || isLoadingTests}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all active:scale-95"
                                >
                                    Anterior
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        // Show pages around current page
                                        let pageNum = currentPage;
                                        if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;

                                        if (pageNum < 1 || pageNum > totalPages) return null;

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                disabled={isLoadingTests}
                                                className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm transition-all ${
                                                    currentPage === pageNum 
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || isLoadingTests}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-all active:scale-95"
                                >
                                    Próximo
                                </button>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Página {currentPage} de {totalPages} • Total de {totalCount} registros
                            </div>
                        </div>
                    )}
                    </>
                )}
            </div>

            <DailyMetricsModal
                isOpen={isMetricsModalOpen}
                onClose={() => setIsMetricsModalOpen(false)}
                user={user}
                onUpdateUser={onUpdateUser}
            />

            <ConfirmEditModal 
                isOpen={editState.isOpen}
                onClose={() => setEditState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmEdit}
                fieldName={editState.field ? COLUMN_LABELS[editState.field] : ''}
                oldValue={editState.oldValue}
                newValue={editState.newValue}
                onChangeNewValue={(val) => setEditState(prev => ({ ...prev, newValue: val }))}
                isSaving={editState.isSaving}
            />

            <ConfirmEditModal 
                isOpen={batchEditState.isOpen}
                onClose={() => setBatchEditState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmBatchEdit}
                fieldName={batchEditState.field ? `${COLUMN_LABELS[batchEditState.field]} (${selectedIds.size} selecionados)` : ''}
                oldValue="Lote"
                newValue={batchEditState.newValue}
                onChangeNewValue={(val) => setBatchEditState(prev => ({ ...prev, newValue: val }))}
                isSaving={batchEditState.isSaving}
            />

            <TestFilterModal 
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                onApply={(filters) => {
                    setFilterState(filters);
                    saveFiltersToDatabase(filters);
                    setCurrentPage(1); // Reset to first page when filtering
                    setIsFilterPanelOpen(false);
                }}
                onClear={clearFilters}
                allFiltersData={allFiltersData}
                initialFilters={filterState}
            />

            <ManualTestModal 
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSave={handleCreateTest}
                nextIdNumber={totalCount + 1}
            />

            <TestObservationModal 
                isOpen={observationModal.isOpen}
                onClose={() => setObservationModal(prev => ({ ...prev, isOpen: false }))}
                onSave={handleSaveObservation}
                initialValue={observationModal.initialValue}
                isMandatory={observationModal.isMandatory}
                status={observationModal.status}
                userAcronym={user?.acronym || '--'}
                userName={user?.name || '--'}
            />

            <ActionMenuModal
                isOpen={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                selectedCount={selectedIds.size}
                handleBatchResultChange={handleBatchResultChange}
                handleBatchAnalystChange={handleBatchAnalystChange}
                setBatchEditState={setBatchEditState}
                analysts={analysts}
            />
        </div>
    );
};

export default TestManagement;
