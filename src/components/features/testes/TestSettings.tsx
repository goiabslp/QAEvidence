import React, { useState, useRef, useEffect } from 'react';
import { Settings, ChevronLeft, Upload, Loader2, FileSpreadsheet, AlertCircle, Check, Square, ArrowUp, ArrowDown, LayoutDashboard, Target, Layers, Activity, Calendar, Clock, XCircle, RotateCcw, Archive, History, RefreshCw, FolderOpen, Trash2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/services/supabaseClient';
import { User, ExcelTestRecord, ExcelTestHistory, TestColumnKey, TestColumnSettings, DEFAULT_COLUMN_SETTINGS, DEFAULT_COLUMN_ORDER } from '../../../types';
import DashboardTab from './DashboardTab';
import TeamGoalsTab from './TeamGoalsTab';

interface TestSettingsProps {
    onClose: () => void;
    user: User;
    allUsers: User[];
    onUpdateSettings: (settings: TestColumnSettings) => Promise<void>;
}

type TabType = 'DATA' | 'VIEW' | 'DASHBOARD' | 'GOALS';

export const COLUMN_LABELS: Record<TestColumnKey, string> = {
    stepsText: 'Replicar a redação para o caso',
    browser: 'Navegador',
    bank: 'Banco',
    backoffice: 'Backoffice',
    mobile: 'Mobile',
    analyst: 'Analista',
    automated: 'Automatizado',
    bcsCode: 'Cód BCSChamados',
    useCase: 'Use Case',
    minimum: 'Minimo',
    priority: 'Prioridade',
    testId: 'Teste ID',
    module: 'Módulo',
    objective: 'Objetivo',
    estimatedTime: 'Tempo estimado',
    prerequisite: 'Pré-requisito',
    description: 'Descrição',
    acceptanceCriteria: 'Critérios de Aceitação',
    result: 'Resultado',
    errorStatus: 'Status Erro',
    observation: 'Observação',
    gap: 'GAP'
};

const TestSettings: React.FC<TestSettingsProps> = ({ onClose, user, allUsers, onUpdateSettings }) => {
    const [activeTab, setActiveTab] = useState<TabType>('DATA');
    
    // --- Data Fetching for Dashboards ---
    const [testRecords, setTestRecords] = useState<ExcelTestRecord[]>([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    
    // --- Filter States ---
    const [filterMinimoSim, setFilterMinimoSim] = useState(false);
    const [selectedBackoffice, setSelectedBackoffice] = useState<string>('Todos');

    const displayedRecords = React.useMemo(() => {
        let filtered = testRecords;
        
        if (filterMinimoSim) {
            filtered = filtered.filter(t => String(t.minimum).trim().toLowerCase() === 'sim');
        }
        
        if (selectedBackoffice !== 'Todos') {
            filtered = filtered.filter(t => t.backoffice === selectedBackoffice);
        }
        
        return filtered;
    }, [testRecords, filterMinimoSim, selectedBackoffice]);

    // --- File Input State ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deleteStatus, setDeleteStatus] = useState({
        active: false,
        progress: 0,
        message: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [hasLoadedTests, setHasLoadedTests] = useState(false);
    const [pendingRecords, setPendingRecords] = useState<any[] | null>(null);
    const [newSheetName, setNewSheetName] = useState('');
    const [currentSheetName, setCurrentSheetName] = useState('Gestão de Testes');
    const SETTINGS_RECORD_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    // --- Column Visibility State ---
    const [settings, setSettings] = useState<TestColumnSettings>(() => {
        const initial = user.testColumnSettings || DEFAULT_COLUMN_SETTINGS;
        return {
            ...initial,
            order: initial.order || DEFAULT_COLUMN_ORDER
        };
    });
    const [isSaving, setIsSaving] = useState(false);
    const [importStatus, setImportStatus] = useState<{
        active: boolean;
        progress: number;
        message: string;
        finished: boolean;
    }>({
        active: false,
        progress: 0,
        message: '',
        finished: false
    });

    // --- Cycle Control States ---
    const [showResetModal, setShowResetModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [showPostCloseModal, setShowPostCloseModal] = useState(false);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
    const [historyList, setHistoryList] = useState<ExcelTestHistory[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showDeleteHistoryModal, setShowDeleteHistoryModal] = useState(false);
    const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);
    const [resetStatus, setResetStatus] = useState({
        active: false,
        progress: 0,
        message: '',
        finished: false
    });

    // Initial check + fetch for Dashboards
    useEffect(() => {
        const checkRecords = async () => {
            try {
                const { count, error } = await supabase
                    .from('excel_test_records')
                    .select('*', { count: 'exact', head: true })
                    .neq('module', 'SYSTEM_SETTINGS');
                
                if (error) throw error;
                setHasLoadedTests((count || 0) > 0);
            } catch (err) {
                console.error("Erro no check inicial:", err);
            }
        };

        const fetchAllData = async () => {
            if (activeTab !== 'DASHBOARD' && activeTab !== 'GOALS' && activeTab !== 'DATA') return;
            if (testRecords.length > 0) return; // Already loaded

            setIsLoadingRecords(true);
            try {
                let allFetchedData: any[] = [];
                let from = 0;
                const PAGE_SIZE = 1000;
                let hasMore = true;

                while (hasMore) {
                    const { data, error } = await supabase
                        .from('excel_test_records')
                        .select('*')
                        .range(from, from + PAGE_SIZE - 1)
                        .order('imported_order', { ascending: true });
                    
                    if (error) throw error;
                    
                    if (data && data.length > 0) {
                        allFetchedData = [...allFetchedData, ...data];
                        from += PAGE_SIZE;
                        if (data.length < PAGE_SIZE) {
                            hasMore = false;
                        }
                    } else {
                        hasMore = false;
                    }
                }

                const settingsRecord = allFetchedData.find(r => r.module === 'SYSTEM_SETTINGS');
                if (settingsRecord) {
                    setCurrentSheetName(settingsRecord.steps_text || 'Gestão de Testes');
                } else {
                    // Fallback check if settings record wasn't in the chunks (unlikely given it's a small table usually)
                     const { data: sData } = await supabase
                        .from('excel_test_records')
                        .select('steps_text')
                        .eq('module', 'SYSTEM_SETTINGS')
                        .maybeSingle();
                    if (sData) setCurrentSheetName(sData.steps_text);
                }

                // Filter out settings for the test list
                const actualData = allFetchedData.filter(r => r.module !== 'SYSTEM_SETTINGS');
                const hasRecords = actualData.length > 0;
                
                if (hasRecords) {
                    const mapped = actualData.map(record => ({
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
                        importedOrder: record.imported_order,
                        createdBy: record.created_by
                    })) as ExcelTestRecord[];
                    setTestRecords(mapped);
                } else {
                    setTestRecords([]);
                }
            } catch (err: any) {
                console.error("Erro ao carregar os testes para métricas:", err);
            } finally {
                setIsLoadingRecords(false);
            }
        };

        const fetchHistory = async () => {
            if (activeTab !== 'DATA') return;
            setIsLoadingHistory(true);
            try {
                const { data, error } = await supabase
                    .from('excel_test_history')
                    .select('id, name, total_records, closed_at, closed_by')
                    .order('closed_at', { ascending: false });
                if (error) throw error;
                if (data) setHistoryList(data as ExcelTestHistory[]);
            } catch (err) {
                console.error("Erro ao carregar histórico:", err);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        checkRecords();
        fetchAllData();
        fetchHistory();
    }, [activeTab]); // Run on tab change for lazy loading


    const handleToggleColumn = (key: TestColumnKey) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleMoveColumn = (key: TestColumnKey, direction: 'up' | 'down', e: React.MouseEvent) => {
        e.stopPropagation();
        setSettings(prev => {
            const currentOrder = prev.order || DEFAULT_COLUMN_ORDER;
            const index = currentOrder.indexOf(key);
            if (index < 0) return prev;
            
            const newOrder = [...currentOrder];
            
            if (direction === 'up' && index > 0) {
                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
            } else if (direction === 'down' && index < newOrder.length - 1) {
                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
            }
            
            return {
                ...prev,
                order: newOrder
            };
        });
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await onUpdateSettings(settings);
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (err) {
            console.error("Error saving settings", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus({
            active: true,
            progress: 5,
            message: 'Carregando arquivo...',
            finished: false
        });
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                setImportStatus(prev => ({ ...prev, progress: 10, message: 'Lendo os dados da planilha...' }));
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const ref = worksheet['!ref'];
                if (!ref) throw new Error("A planilha está vazia.");
                
                const range = XLSX.utils.decode_range(ref);
                if (range.e.c < 21) {
                    throw new Error("Estrutura da planilha incompatível. Ela precisa conter as colunas de A até V.");
                }
                
                setImportStatus(prev => ({ ...prev, progress: 30, message: 'Organizando as informações...' }));
                const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
                
                if (jsonData.length === 0) {
                    throw new Error("A planilha não contém dados.");
                }

                let rawRows = jsonData;
                if (rawRows.length > 0) {
                    const firstRow = rawRows[0];
                    if (String(firstRow[11] || '').trim().toLowerCase().includes('teste id') || 
                        String(firstRow[0] || '').trim().toLowerCase().includes('replicar a redação')) {
                        rawRows = rawRows.slice(1);
                    }
                }

                const validRows = rawRows.filter(row => row.some(cell => cell !== ''));

                const records = validRows.map((row, index) => {
                    const importedOrder = index + 1;
                    const rawTestId = String(row[11] || '').trim();
                    // Generate sequential QA-XXXXX ID if spreadsheet ID is empty
                    const testId = rawTestId || `QA-${String(importedOrder).padStart(5, '0')}`;

                    return {
                        steps_text: String(row[0] || ''),
                        browser: String(row[1] || ''),
                        bank: String(row[2] || ''),
                        backoffice: String(row[3] || ''),
                        mobile: String(row[4] || ''),
                        analyst: '', 
                        automated: String(row[6] || ''),
                        bcs_code: String(row[7] || ''),
                        use_case: String(row[8] || ''),
                        minimum: String(row[9] || ''),
                        priority: String(row[10] || ''),
                        test_id: testId,
                        module: String(row[12] || ''),
                        objective: String(row[13] || ''),
                        estimated_time: String(row[14] || ''),
                        prerequisite: String(row[15] || ''),
                        description: String(row[16] || ''),
                        acceptance_criteria: String(row[17] || ''),
                        result: 'Pendente', 
                        error_status: String(row[19] || ''),
                        observation: String(row[20] || ''),
                        gap: String(row[21] || ''),
                        imported_order: importedOrder, 
                        created_by: user.id
                    };
                });

                setImportStatus(prev => ({ ...prev, progress: 50, message: 'Preparação concluída!' }));
                
                // Automatically trigger the import process
                await confirmImport(records);

            } catch (err: any) {
                console.error("Erro ao processar planilha:", err);
                setError(err.message || "Ocorreu um erro ao processar o arquivo.");
                setImportStatus(prev => ({ ...prev, active: false }));
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const confirmImport = async (records: any[]) => {
        setImportStatus({
            active: true,
            progress: 50,
            message: 'Iniciando importação...',
            finished: false
        });

        try {
            // Simulated progress while preparing
            setImportStatus(prev => ({ ...prev, progress: 55, message: 'Validando registros...' }));
            
            // Delete old tests (keep settings)
            await supabase.from('excel_test_records')
                .delete()
                .neq('module', 'SYSTEM_SETTINGS');

            setImportStatus(prev => ({ ...prev, progress: 60, message: 'Iniciando gravação em lotes...' }));

            // Batch insertion logic for large amounts of records
            const BATCH_SIZE = 1000;
            const totalRecords = records.length;
            const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

            for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
                const chunk = records.slice(i, i + BATCH_SIZE);
                const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
                
                // Update progress based on batches (from 60% to 90%)
                const batchProgress = 60 + Math.floor((currentBatch / totalBatches) * 30);
                setImportStatus(prev => ({ 
                    ...prev, 
                    progress: batchProgress, 
                    message: `Importando lote ${currentBatch} de ${totalBatches}... (${totalRecords} registros)` 
                }));

                const { error: insertError } = await supabase
                    .from('excel_test_records')
                    .insert(chunk);

                if (insertError) throw insertError;
            }
            
            setImportStatus(prev => ({ 
                ...prev, 
                progress: 100, 
                message: 'Importação de dados concluída com sucesso!', 
                finished: true 
            }));
            
            setHasLoadedTests(true);
            setPendingRecords(null);

        } catch (err: any) {
            console.error("Erro ao finalizar importação:", err);
            setError(err.message);
            setImportStatus(prev => ({ ...prev, active: false }));
            alert("Erro na importação: " + err.message);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const saveImportName = async () => {
        if (!newSheetName.trim()) return;

        setIsLoading(true);
        try {
            // Save/Update sheet name magic record
            const { error: settingsError } = await supabase
                .from('excel_test_records')
                .upsert({
                    id: SETTINGS_RECORD_ID,
                    module: 'SYSTEM_SETTINGS',
                    steps_text: newSheetName,
                    created_by: user.id
                });

            if (settingsError) throw settingsError;

            setCurrentSheetName(newSheetName);
            
            // Reload dashboard data
            const { data: newData } = await supabase.from('excel_test_records').select('*');
            if (newData) {
                setTestRecords(newData.filter(r => r.module !== 'SYSTEM_SETTINGS').map(record => ({
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
                    importedOrder: record.imported_order,
                    createdBy: record.created_by
                })) as ExcelTestRecord[]);
            }

            // Close modal
            setImportStatus(prev => ({ ...prev, active: false }));
            setNewSheetName('');

        } catch (err: any) {
            console.error("Erro ao salvar nome da planilha:", err);
            alert("Erro ao salvar nome: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSheetName = async (name: string) => {
        if (!name.trim()) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('excel_test_records')
                .upsert({
                    id: SETTINGS_RECORD_ID,
                    module: 'SYSTEM_SETTINGS',
                    steps_text: name,
                    created_by: user.id
                });
            if (error) throw error;
            setCurrentSheetName(name);
        } catch (err) {
            console.error("Erro ao atualizar nome da planilha:", err);
            alert("Erro ao atualizar nome.");
        } finally {
            setIsLoading(false);
        }
    };


    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const clearTests = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch ALL IDs to be deleted (Paginated to handle 30k+ records)
            let allIds: string[] = [];
            let from = 0;
            const FETCH_PAGE_SIZE = 1000;
            let hasMore = true;

            console.log('Buscando IDs para limpar...');
            while (hasMore) {
                const { data, error: idErr } = await supabase
                    .from('excel_test_records')
                    .select('id')
                    .neq('module', 'SYSTEM_SETTINGS')
                    .range(from, from + FETCH_PAGE_SIZE - 1);
                
                if (idErr) throw idErr;
                if (data && data.length > 0) {
                    allIds = [...allIds, ...data.map(d => d.id)];
                    from += FETCH_PAGE_SIZE;
                    if (data.length < FETCH_PAGE_SIZE) hasMore = false;
                } else {
                    hasMore = false;
                }
            }

            if (allIds.length > 0) {
                console.log(`Limpando ${allIds.length} registros em lotes...`);
                const chunkSize = 200;
                for (let i = 0; i < allIds.length; i += chunkSize) {
                    const chunk = allIds.slice(i, i + chunkSize);
                    const { error: delErr } = await supabase
                        .from('excel_test_records')
                        .delete()
                        .in('id', chunk);
                    
                    if (delErr) throw delErr;
                }
            }

            setHasLoadedTests(false);
            setTestRecords([]);
            setError(null);
            setShowClearModal(false);
        } catch (err: any) {
            console.error('Erro ao limpar base:', err);
            setError('Falha ao limpar a base global.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSheet = async () => {
        setIsLoading(true);
        setError(null);
        setDeleteStatus({
            active: true,
            progress: 10,
            message: 'Iniciando exclusão permanente...'
        });

        try {
            // 1. Fetch ALL IDs to be deleted (Paginated to handle large datasets)
            let allIds: string[] = [];
            let from = 0;
            const FETCH_PAGE_SIZE = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error: idErr } = await supabase
                    .from('excel_test_records')
                    .select('id')
                    .neq('module', 'SYSTEM_SETTINGS')
                    .range(from, from + FETCH_PAGE_SIZE - 1);
                
                if (idErr) throw idErr;
                
                if (data && data.length > 0) {
                    allIds = [...allIds, ...data.map(d => d.id)];
                    from += FETCH_PAGE_SIZE;
                    if (data.length < FETCH_PAGE_SIZE) hasMore = false;
                } else {
                    hasMore = false;
                }
            }

            setDeleteStatus(prev => ({ ...prev, progress: 30, message: `Excluindo ${allIds.length} registros...` }));

            // 2. Delete in batches
            if (allIds.length > 0) {
                const chunkSize = 200;
                for (let i = 0; i < allIds.length; i += chunkSize) {
                    const chunk = allIds.slice(i, i + chunkSize);
                    const { error: delErr } = await supabase
                        .from('excel_test_records')
                        .delete()
                        .in('id', chunk);
                    
                    if (delErr) throw delErr;
                    
                    const progress = 30 + Math.round((i / allIds.length) * 60);
                    setDeleteStatus(prev => ({ ...prev, progress, message: `Limpando base de dados (${progress}%)...` }));
                }
            }

            setDeleteStatus(prev => ({ ...prev, progress: 95, message: 'Resetando configurações...' }));

            // 3. Reset sheet name in SYSTEM_SETTINGS
            await supabase
                .from('excel_test_records')
                .upsert({
                    id: SETTINGS_RECORD_ID,
                    module: 'SYSTEM_SETTINGS',
                    steps_text: '', // Clear the sheet name
                    created_by: user.id
                });

            // 4. Update UI state
            setHasLoadedTests(false);
            setTestRecords([]);
            setCurrentSheetName('');
            setDeleteStatus({ active: false, progress: 100, message: 'Sucesso!' });
            setShowDeleteConfirmModal(false);

        } catch (err: any) {
            console.error('Erro ao excluir planilha:', err);
            setError('Falha ao excluir completamente a planilha.');
            setDeleteStatus({ active: false, progress: 0, message: '' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetSheet = async () => {
        setIsLoading(true);
        setError(null);
        setResetStatus({
            active: true,
            progress: 5,
            message: 'Preparando reset da planilha...',
            finished: false
        });

        try {
            // 1. Fetch ALL IDs to be reset (Paginated to handle 30k+ records)
            let allIds: string[] = [];
            let from = 0;
            const FETCH_PAGE_SIZE = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error: idErr } = await supabase
                    .from('excel_test_records')
                    .select('id')
                    .neq('module', 'SYSTEM_SETTINGS')
                    .range(from, from + FETCH_PAGE_SIZE - 1);
                
                if (idErr) throw idErr;
                if (data && data.length > 0) {
                    allIds = [...allIds, ...data.map(d => d.id)];
                    from += FETCH_PAGE_SIZE;
                    if (data.length < FETCH_PAGE_SIZE) hasMore = false;
                } else {
                    hasMore = false;
                }

                // Initial progress during fetch (up to 15%)
                const fetchProgress = Math.min(15, Math.floor((allIds.length / 30000) * 15));
                setResetStatus(prev => ({ ...prev, progress: fetchProgress }));
            }

            if (allIds.length === 0) {
                setResetStatus({ active: false, progress: 0, message: '', finished: false });
                setIsLoading(false);
                setShowResetModal(false);
                return;
            }

            // 2. Process in chunks of 200
            const chunkSize = 200;
            for (let i = 0; i < allIds.length; i += chunkSize) {
                const chunk = allIds.slice(i, i + chunkSize);
                const { error: updateErr } = await supabase
                    .from('excel_test_records')
                    .update({ 
                        result: 'Pendente', 
                        analyst: '', 
                        observation: '' 
                    })
                    .in('id', chunk);
                
                if (updateErr) throw updateErr;

                // Calculate progress from 15% to 95%
                const currentProgress = 15 + Math.floor(((i + chunk.length) / allIds.length) * 80);
                
                let dynamicMessage = 'Preparando reset da planilha...';
                if (currentProgress > 20 && currentProgress <= 40) dynamicMessage = 'Limpando status dos testes...';
                else if (currentProgress > 40 && currentProgress <= 60) dynamicMessage = 'Removendo analistas dos registros...';
                else if (currentProgress > 60 && currentProgress <= 80) dynamicMessage = 'Limpando observações...';
                else if (currentProgress > 80 && currentProgress <= 95) dynamicMessage = 'Aplicando alterações finais...';
                else if (currentProgress > 95) dynamicMessage = 'Finalizando reset...';

                setResetStatus({
                    active: true,
                    progress: Math.min(currentProgress, 99),
                    message: dynamicMessage,
                    finished: false
                });
            }

            setResetStatus({
                active: true,
                progress: 100,
                message: 'Planilha resetada com sucesso',
                finished: true
            });

            // Update local state
            setTestRecords(prev => prev.map(r => ({ 
                ...r, 
                result: 'Pendente', 
                analyst: '', 
                observation: '' 
            })));
            
            setShowResetModal(false);
            setShowPostCloseModal(false);

            // Close loading modal after a short delay to show 100% success
            setTimeout(() => {
                setResetStatus({ active: false, progress: 0, message: '', finished: false });
            }, 1500);

        } catch (err: any) {
            console.error('Erro ao resetar planilha:', err);
            setError(`Erro ao resetar: ${err.message || 'Erro desconhecido'}`);
            setResetStatus({ active: false, progress: 0, message: '', finished: false });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSheet = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch ALL records to be archived (Paginated to handle 30k+ records)
            let allRecords: any[] = [];
            let from = 0;
            const FETCH_PAGE_SIZE = 1000;
            let hasMore = true;

            console.log('Buscando todos os registros para encerrar...');
            while (hasMore) {
                const { data, error: fetchErr } = await supabase
                    .from('excel_test_records')
                    .select('*')
                    .neq('module', 'SYSTEM_SETTINGS')
                    .order('imported_order', { ascending: true })
                    .range(from, from + FETCH_PAGE_SIZE - 1);
                
                if (fetchErr) throw fetchErr;
                if (data && data.length > 0) {
                    allRecords = [...allRecords, ...data];
                    from += FETCH_PAGE_SIZE;
                    if (data.length < FETCH_PAGE_SIZE) hasMore = false;
                } else {
                    hasMore = false;
                }
            }
            
            if (allRecords.length === 0) {
                alert("Nenhum dado para encerrar.");
                setIsLoading(false);
                return;
            }

            // 2. Insert into history tracking
            const { error: historyError } = await supabase
                .from('excel_test_history')
                .insert({
                    name: currentSheetName,
                    total_records: allRecords.length,
                    closed_by: user.name,
                    records_data: allRecords
                });

            if (historyError) throw historyError;

            // 3. Refresh history list
            const { data: hData } = await supabase
                .from('excel_test_history')
                .select('id, name, total_records, closed_at, closed_by')
                .order('closed_at', { ascending: false });
            if (hData) setHistoryList(hData as ExcelTestHistory[]);

            setShowCloseModal(false);
            setShowPostCloseModal(true);
            console.log(`Encerrado com sucesso: ${allRecords.length} registros salvos no histórico.`);
        } catch (err: any) {
            console.error("Erro ao encerrar planilha:", err);
            alert("Erro ao encerrar planilha: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteHistory = async () => {
        if (!selectedDeleteId) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('excel_test_history')
                .delete()
                .eq('id', selectedDeleteId);
            
            if (error) throw error;

            setHistoryList(prev => prev.filter(h => h.id !== selectedDeleteId));
            setShowDeleteHistoryModal(false);
            setSelectedDeleteId(null);
        } catch (err: any) {
            console.error("Erro ao excluir histórico:", err);
            alert("Erro ao excluir histórico.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReopenHistory = async () => {
        if (!selectedHistoryId) return;

        setIsLoading(true);
        try {
            setShowReopenModal(false);
            const historyId = selectedHistoryId;
            // Fetch the full history record
            const { data: hData, error: hError } = await supabase
                .from('excel_test_history')
                .select('*')
                .eq('id', historyId)
                .single();
            if (hError) throw hError;

            const oldRecords = hData.records_data;
            if (!oldRecords || oldRecords.length === 0) {
                throw new Error("O histórico está vazio.");
            }

            setImportStatus({ active: true, progress: 10, message: 'Restaurando do histórico...', finished: false });

            // Clear current active
            await supabase.from('excel_test_records').delete().neq('module', 'SYSTEM_SETTINGS');
            setImportStatus(prev => ({ ...prev, progress: 30, message: 'Gravando registros restaurados...' }));

            // Insert the old records by ignoring IDs or letting supabase assign new IDs
            const mappedToInsert = oldRecords.map((r: any) => {
                const { id, created_at, updated_at, ...rest } = r; // remove old UUID and dates
                return { ...rest, module: rest.module || '' };
            });

            const BATCH_SIZE = 1000;
            const totalRecords = mappedToInsert.length;
            const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

            for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
                const chunk = mappedToInsert.slice(i, i + BATCH_SIZE);
                const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
                const batchProgress = 30 + Math.floor((currentBatch / totalBatches) * 60);
                setImportStatus(prev => ({ 
                    ...prev, 
                    progress: batchProgress, 
                    message: `Restaurando lote ${currentBatch} de ${totalBatches}...` 
                }));

                const { error: insertError } = await supabase.from('excel_test_records').insert(chunk);
                if (insertError) throw insertError;
            }

            // Update sheet name
            setCurrentSheetName(hData.name);
            await supabase.from('excel_test_records').upsert({
                id: SETTINGS_RECORD_ID,
                module: 'SYSTEM_SETTINGS',
                steps_text: hData.name,
                created_by: user.id
            });

            // Reload records
            const { data: currentData } = await supabase
                .from('excel_test_records')
                .select('*')
                .neq('module', 'SYSTEM_SETTINGS')
                .order('imported_order', { ascending: true });
            
            if (currentData) {
                setTestRecords(currentData.map((record: any) => ({
                    id: record.id, stepsText: record.steps_text, browser: record.browser, bank: record.bank,
                    backoffice: record.backoffice, mobile: record.mobile, analyst: record.analyst, automated: record.automated,
                    bcsCode: record.bcs_code, useCase: record.use_case, minimum: record.minimum, priority: record.priority,
                    testId: record.test_id, module: record.module, objective: record.objective, estimatedTime: record.estimated_time,
                    prerequisite: record.prerequisite, description: record.description, acceptanceCriteria: record.acceptance_criteria,
                    result: record.result, errorStatus: record.error_status, observation: record.observation, gap: record.gap,
                    importedOrder: record.imported_order, createdBy: record.created_by
                })));
            }

            setHasLoadedTests(true);
            setImportStatus(prev => ({ ...prev, progress: 100, message: 'Restauração concluída!', finished: true }));
            
            setTimeout(() => {
                setImportStatus(prev => ({ ...prev, active: false }));
            }, 1500);

        } catch (err: any) {
            console.error("Erro ao restaurar histórico:", err);
            alert("Erro ao restaurar: " + err.message);
            setImportStatus(prev => ({ ...prev, active: false }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-12">
            {/* Header Sticky */}
            <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Central de Testes</h2>
                            <p className="text-sm text-slate-500 font-medium">Controle total sobre a operação de Quality Assurance</p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto shrink-0 shadow-inner">
                        <button
                            onClick={() => setActiveTab('DATA')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'DATA' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Gestão de Dados
                        </button>
                        <button
                            onClick={() => setActiveTab('VIEW')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'VIEW' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            Exibição
                        </button>
                        <button
                            onClick={() => setActiveTab('DASHBOARD')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'DASHBOARD' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('GOALS')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'GOALS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <Target className="w-4 h-4" />
                            Metas
                        </button>
                    </div>

                    {/* Minimum Toggle - Only for Dashboard header. Goals will have it in its own action bar */}
                    {activeTab === 'DASHBOARD' && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl shrink-0 animate-in fade-in slide-in-from-right-4">
                            <span className="text-sm font-bold text-slate-700">Mínimo Sim</span>
                            <button 
                                onClick={() => setFilterMinimoSim(!filterMinimoSim)}
                                className={`w-11 h-6 rounded-full transition-colors relative shadow-inner ${filterMinimoSim ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${filterMinimoSim ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:py-6">
                {activeTab === 'DATA' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 items-start">
                            
                            {/* Coluna Esquerda: Ações Principais */}
                            <div className="xl:col-span-7 flex flex-col gap-4">
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                                    <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                                        Gestão de Planilhas
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {/* Import Box */}
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row items-start gap-3 transition-all hover:border-slate-200 shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                <Upload className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div className="flex-1 w-full">
                                                <h4 className="font-bold text-slate-800 text-sm mb-1">Importação Mestra</h4>
                                                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                                    Faça upload de um arquivo `.xlsx` contendo os casos mapeados (A até V).
                                                </p>
                                                
                                                {!hasLoadedTests && !pendingRecords && (
                                                    <div className="flex items-center">
                                                        <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                                        <button
                                                            onClick={triggerFileInput}
                                                            disabled={isLoading}
                                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-black text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                                                        >
                                                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                            {isLoading ? 'Importando...' : 'Selecionar Planilha'}
                                                        </button>
                                                    </div>
                                                )}
                                                {hasLoadedTests && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                         <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                                        <button
                                                            onClick={triggerFileInput}
                                                            disabled={isLoading}
                                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-black text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                                                        >
                                                            <Upload className="w-3.5 h-3.5" />
                                                            Importar Nova Planilha
                                                        </button>
                                                        <p className="text-[10px] text-slate-400 font-bold tracking-wide">Isso substituirá os dados atuais.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sheet Name Box */}
                                        {hasLoadedTests && !pendingRecords && (
                                            <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-3 transition-all hover:bg-indigo-50/70 shadow-sm">
                                                <div className="w-10 h-10 rounded-full bg-white border border-indigo-100 flex items-center justify-center shrink-0">
                                                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="flex-1 w-full flex flex-col justify-center">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                                                        <h4 className="font-bold text-slate-800 text-sm whitespace-nowrap">Nome da Planilha</h4>
                                                        <input 
                                                            type="text"
                                                            defaultValue={currentSheetName}
                                                            onBlur={(e) => handleUpdateSheetName(e.target.value)}
                                                            className="w-full sm:max-w-xs px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 mt-1 italic font-medium">Auto-salvamento ativo. Reflete para todos na listagem.</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Cycle Control Box */}
                                        {hasLoadedTests && !pendingRecords && (
                                            <div className="flex flex-col sm:flex-row items-stretch gap-3">
                                                <button
                                                    onClick={() => setShowResetModal(true)}
                                                    className="w-full sm:flex-1 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-3 hover:bg-amber-50 hover:border-amber-300 transition-all shadow-sm group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        <RotateCcw className="w-4 h-4 text-amber-600 group-hover:-rotate-180 transition-transform duration-500" />
                                                    </div>
                                                    <div className="text-center sm:text-left">
                                                        <span className="block text-xs font-black text-amber-900 leading-none mb-1 mt-0.5">Resetar Planilha</span>
                                                        <span className="block text-[9px] font-bold text-amber-700/70">Zerar status e analistas</span>
                                                    </div>
                                                </button>
                                                
                                                <button
                                                    onClick={() => setShowCloseModal(true)}
                                                    className="w-full sm:flex-1 p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-3 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        <Archive className="w-4 h-4 text-emerald-600" />
                                                    </div>
                                                    <div className="text-center sm:text-left">
                                                        <span className="block text-xs font-black text-emerald-900 leading-none mb-1 mt-0.5">Encerrar Planilha</span>
                                                        <span className="block text-[9px] font-bold text-emerald-700/70">Salvar no histórico</span>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setShowDeleteConfirmModal(true)}
                                                    className="w-full sm:flex-1 p-3 bg-red-50/50 border border-red-200/60 rounded-xl flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-3 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </div>
                                                    <div className="text-center sm:text-left">
                                                        <span className="block text-xs font-black text-red-900 leading-none mb-1 mt-0.5">Excluir Planilha</span>
                                                        <span className="block text-[9px] font-bold text-red-700/70 italic">Ação irreversível</span>
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-800">
                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                <p className="text-xs font-bold">{error}</p>
                                            </div>
                                        )}

                                    </div>
                                </div>


                            </div>

                            {/* Coluna Direita: Informações e Status */}
                            <div className="xl:col-span-5 flex flex-col gap-4">
                                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm xl:sticky xl:top-24">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                        Informações e Histórico
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        {/* Total Records */}
                                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shadow-inner">
                                                    <Layers className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="block text-[8px] font-black tracking-widest text-slate-400 uppercase">Volume Global</span>
                                                    <span className="font-bold text-slate-700 text-xs">Total Registros</span>
                                                </div>
                                            </div>
                                            <span className="text-xl font-black text-indigo-600">{testRecords.length}</span>
                                        </div>

                                        {/* Last Import Date */}
                                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-sky-100 rounded-lg text-sky-600 shadow-inner">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="block text-[8px] font-black tracking-widest text-slate-400 uppercase">Histórico</span>
                                                    <span className="font-bold text-slate-700 text-xs">Importação</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                                                {testRecords.length > 0 && testRecords[0].created_at 
                                                    ? new Date(testRecords[0].created_at).toLocaleDateString('pt-BR') 
                                                    : 'Desconhecida'}
                                            </span>
                                        </div>

                                        {/* History Box (Moved from left column) */}
                                        <div className="pt-2 mt-2 border-t border-slate-100">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <History className="w-3.5 h-3.5 text-indigo-400" />
                                                Histórico de Planilhas
                                            </h4>
                                            
                                            {isLoadingHistory ? (
                                                <div className="flex flex-col items-center justify-center py-6">
                                                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mb-2" />
                                                    <p className="text-[10px] text-slate-500 font-bold">Carregando...</p>
                                                </div>
                                            ) : historyList.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 border border-slate-100 border-dashed rounded-xl flex-1 min-h-[120px]">
                                                    <Archive className="w-6 h-6 text-slate-300 mb-2" />
                                                    <p className="text-[10px] font-medium text-slate-500">Nenhuma planilha arquivada.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                                                    {historyList.map(item => (
                                                        <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition-all group shadow-sm hover:shadow">
                                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                                                    <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="font-bold text-slate-800 text-[11px] truncate leading-none mb-1">{item.name}</h4>
                                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                                                                        <span>{new Date(item.closed_at).toLocaleDateString('pt-BR')}</span>
                                                                        <span>•</span>
                                                                        <span>{item.total_records}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedHistoryId(item.id);
                                                                        setShowReopenModal(true);
                                                                    }}
                                                                    title="Reabrir Planilha"
                                                                    className="p-1.5 text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm active:scale-90"
                                                                >
                                                                    <FolderOpen className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedDeleteId(item.id);
                                                                        setShowDeleteHistoryModal(true);
                                                                    }}
                                                                    title="Excluir do Histórico"
                                                                    className="p-1.5 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all shadow-sm active:scale-90"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {!hasLoadedTests && (
                                            <div className="flex flex-col items-center justify-center p-4 text-center bg-slate-50 border border-slate-100 border-dashed rounded-xl mt-2">
                                                <Layers className="w-6 h-6 text-slate-300 mb-2" />
                                                <p className="text-[10px] font-medium text-slate-500">Importe uma planilha mestra para visualizar as métricas globais.</p>
                                            </div>
                                        )}


                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'VIEW' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-indigo-600" />
                                        Layout da Listagem
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Ligue ou desligue as colunas para simplificar a visualização do grid e altere a ordem dos itens.</p>
                                </div>
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSaving}
                                    className="flex items-center justify-center gap-2 px-8 py-3 font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 shrink-0"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    {isSaving ? 'Salvando...' : 'Gravar Alterações'}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {(settings.order || DEFAULT_COLUMN_ORDER)
                                    .filter(key => ![
                                        'estimatedTime', 'errorStatus', 'observation', 'gap',
                                        'objective', 'prerequisite', 'description', 'acceptanceCriteria'
                                    ].includes(key))
                                    .map((key, index, arr) => {
                                    const isChecked = settings[key];
                                    return (
                                        <div key={key} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                                            isChecked 
                                                ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}>
                                            <button
                                                onClick={() => handleToggleColumn(key)}
                                                className="flex-1 flex items-center gap-3 text-left group"
                                            >
                                                <div className={`flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 transition-colors ${
                                                    isChecked ? 'bg-indigo-600 text-white shadow-inner' : 'bg-slate-100 border border-slate-300 text-transparent group-hover:border-slate-400'
                                                }`}>
                                                    <Check className={`w-4 h-4 ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                                                </div>
                                                <span className={`text-sm tracking-tight line-clamp-1 ${isChecked ? 'font-black text-indigo-900' : 'font-bold text-slate-500'}`}>
                                                    {COLUMN_LABELS[key as TestColumnKey]}
                                                </span>
                                            </button>
                                            
                                            <div className="flex flex-col gap-1 border-l border-slate-200/60 pl-2">
                                                <button 
                                                    onClick={(e) => handleMoveColumn(key, 'up', e)}
                                                    disabled={index === 0}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                    title="Mover para cima"
                                                >
                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleMoveColumn(key, 'down', e)}
                                                    disabled={index === arr.length - 1}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                    title="Mover para baixo"
                                                >
                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'DASHBOARD' && (
                    <>
                        {isLoadingRecords ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                                <p className="text-slate-500 font-bold">Processando KPIs...</p>
                            </div>
                        ) : displayedRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <FileSpreadsheet className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-2">Base de Dados Vazia</h3>
                                <p className="text-slate-500 font-medium">Nenhum teste encontrado para os filtros atuais.</p>
                            </div>
                        ) : (
                            <DashboardTab testRecords={displayedRecords} allUsers={allUsers} allRecords={testRecords} />
                        )}
                    </>
                )}

                {activeTab === 'GOALS' && (
                    <>
                        {isLoadingRecords ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                                <p className="text-slate-500 font-bold">Processando Metas da Equipe...</p>
                            </div>
                        ) : (
                             <TeamGoalsTab 
                                user={user} 
                                testRecords={displayedRecords} 
                                allRecords={testRecords}
                                isMinimoSimActive={filterMinimoSim} 
                                onToggleMinimoSim={() => setFilterMinimoSim(!filterMinimoSim)}
                                selectedBackoffice={selectedBackoffice}
                                onBackofficeChange={setSelectedBackoffice}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Import Loading Modal */}
            {importStatus.active && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-4 text-center">
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
                                {importStatus.finished ? (
                                    <div className="w-full h-full bg-emerald-500 rounded-3xl flex items-center justify-center animate-in zoom-in duration-500">
                                        <Check className="w-10 h-10 text-white" />
                                    </div>
                                ) : (
                                    <>
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <h3 className={`text-2xl font-black tracking-tight mb-2 ${importStatus.finished ? 'text-emerald-600' : 'text-slate-800'}`}>
                                {importStatus.finished ? 'Importação Concluída!' : 'Processando Arquivo'}
                            </h3>
                            <p className="text-slate-500 text-sm font-medium px-4">
                                {importStatus.message}
                            </p>
                        </div>

                        <div className="px-10 pb-10">
                            {!importStatus.finished ? (
                                <>
                                    <div className="mt-8 mb-2 flex justify-between items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Operação</span>
                                        <span className="text-lg font-black text-indigo-600">
                                            {importStatus.progress}%
                                        </span>
                                    </div>
                                    
                                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner group">
                                        <div 
                                            className="h-full rounded-full transition-all duration-700 shadow-sm relative bg-indigo-600 shadow-indigo-200"
                                            style={{ width: `${importStatus.progress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Não feche esta janela</span>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-6 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-3xl">
                                        <label className="text-[10px] font-black text-indigo-600 uppercase mb-2 block tracking-widest">Nome da Planilha (Obrigatório)</label>
                                        <input 
                                            type="text"
                                            value={newSheetName}
                                            onChange={(e) => setNewSheetName(e.target.value)}
                                            placeholder="Ex: Planilha de Testes - Versão 2.0"
                                            className="w-full px-4 py-3 text-sm font-bold text-slate-700 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                                            autoFocus
                                            onKeyDown={(e) => { if (e.key === 'Enter') saveImportName(); }}
                                        />
                                    </div>
                                    <button
                                        onClick={saveImportName}
                                        disabled={isLoading || !newSheetName.trim()}
                                        className="w-full flex items-center justify-center gap-3 px-6 py-4 font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        Concluir e Salvar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <RotateCcw className="w-8 h-8 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-2">Resetar Planilha?</h3>
                            <p className="text-sm text-slate-500 font-medium">Todos os testes voltarão para "Pendente" e os analistas serão removidos.</p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowResetModal(false)} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleResetSheet} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Sheet Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Archive className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-2">Encerrar Planilha Ativa?</h3>
                            <p className="text-sm text-slate-500 font-medium mb-4">A planilha atual será salva no histórico em formato somente-leitura.</p>
                            <div className="bg-emerald-50 text-emerald-800 p-3 flex gap-3 rounded-xl text-left border border-emerald-100">
                                <Activity className="w-5 h-5 shrink-0" />
                                <span className="text-xs font-bold leading-relaxed">Isso preservará a visão atual de "Sucesso" ou "Erro" de todos os registros na data de hoje.</span>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowCloseModal(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleCloseSheet} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, Encerrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post-Close Options Modal */}
            {showPostCloseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center pb-6">
                            <div className="w-20 h-20 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 shadow-inner">
                                <Check className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Planilha Salva!</h3>
                            <p className="text-sm text-slate-500 font-medium">A planilha foi movida para o Histórico com sucesso. O que você quer fazer agora na área de trabalho?</p>
                        </div>
                        <div className="px-6 pb-6 space-y-3">
                            <button 
                                onClick={() => {
                                    setShowPostCloseModal(false);
                                    handleResetSheet();
                                }} 
                                className="w-full p-4 flex items-center gap-4 bg-white border-2 border-indigo-100 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group shadow-sm"
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <RotateCcw className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <span className="block font-black text-slate-800 text-sm group-hover:text-indigo-800">Continuar com a mesma</span>
                                    <span className="block text-xs text-slate-500 font-medium mt-0.5">Zera os dados da planilha atual para um novo ciclo.</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => {
                                    setShowPostCloseModal(false);
                                    clearTests();
                                }} 
                                className="w-full p-4 flex items-center gap-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-slate-400 hover:bg-slate-50 transition-all text-left group shadow-sm"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Upload className="w-5 h-5 text-slate-600" />
                                </div>
                                <div className="flex-1">
                                    <span className="block font-black text-slate-800 text-sm">Carregar uma nova</span>
                                    <span className="block text-xs text-slate-500 font-medium mt-0.5">Limpa o painel global para envio de novo arquivo .xlsx.</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Base Modal */}
            {showClearModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-2">Excluir Base Global?</h3>
                            <p className="text-sm text-slate-500 font-medium">Isso removerá completamente todos os testes carregados e limpará a visão de todos os usuários imediatamente.</p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowClearModal(false)} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={clearTests} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reopen History Modal */}
            {showReopenModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FolderOpen className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 mb-2">Reabrir Planilha?</h3>
                            <p className="text-sm text-slate-500 font-medium">A planilha ativa atual será TOTALMENTE substituída pelos dados deste histórico. Deseja continuar?</p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => { setShowReopenModal(false); setSelectedHistoryId(null); }} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">Cancelar</button>
                            <button onClick={handleReopenHistory} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, Reabrir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete History Confirmation Modal */}
            {showDeleteHistoryModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Histórico?</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Você está prestes a excluir esta planilha do histórico. <br />
                                <span className="font-bold text-red-500">Essa ação não poderá ser desfeita.</span> <br />
                                Deseja continuar?
                            </p>
                        </div>
                        <div className="flex border-t border-slate-100">
                            <button
                                onClick={() => {
                                    setShowDeleteHistoryModal(false);
                                    setSelectedDeleteId(null);
                                }}
                                className="flex-1 px-4 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors border-r border-slate-100"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteHistory}
                                disabled={isLoading}
                                className="flex-1 px-4 py-4 text-sm font-black text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Exclusão'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Loading Modal */}
            {resetStatus.active && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col items-center p-8 text-center animate-in zoom-in-95 duration-300">
                        {/* Status Icon */}
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 ${resetStatus.finished ? 'bg-emerald-100' : 'bg-indigo-50'}`}>
                            {resetStatus.finished ? (
                                <Check className="w-10 h-10 text-emerald-600 animate-bounce" />
                            ) : (
                                <RotateCcw className="w-10 h-10 text-indigo-600 animate-spin-slow" />
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {resetStatus.finished ? 'Reset concluído!' : 'Resetando planilha'}
                        </h3>
                        <p className="text-slate-500 mb-8 max-w-[280px]">
                            {resetStatus.message}
                        </p>

                        {/* Progress Container */}
                        <div className="w-full space-y-3">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Progresso</span>
                                <span className="text-lg font-black text-indigo-600 tabular-nums">{resetStatus.progress}%</span>
                            </div>
                            
                            {/* Progress bar background */}
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50 relative shadow-inner">
                                {/* Animated progress fill */}
                                <div 
                                    className={`h-full transition-all duration-700 ease-out relative rounded-full ${
                                        resetStatus.finished ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600'
                                    }`}
                                    style={{ width: `${resetStatus.progress}%` }}
                                >
                                    {/* Shimmer effect */}
                                    {!resetStatus.finished && (
                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-center pt-2">
                                {!resetStatus.finished && (
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Confirmação de Exclusão Completa */}
            {showDeleteConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-100 group">
                                <AlertTriangle className="w-10 h-10 text-red-500 group-hover:scale-110 transition-transform" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Exclusão Permanente</h3>
                            <p className="text-slate-500 text-base leading-relaxed mb-10">
                                Você está prestes a excluir completamente a planilha atual.<br/>
                                <span className="font-black text-red-600 uppercase tracking-widest text-xs">Todos os dados serão apagados permanentemente.</span><br/>
                                Deseja continuar?
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirmModal(false)}
                                    className="px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteSheet}
                                    className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 hover:shadow-xl hover:shadow-red-500/30 transition-all active:scale-95"
                                >
                                    Confirmar exclusão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Progresso da Exclusão */}
            {deleteStatus.active && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-white/20">
                        <div className="text-center space-y-8">
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                                <div 
                                    className="absolute inset-0 border-4 border-red-500 rounded-full border-t-transparent animate-spin"
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Trash2 className="w-8 h-8 text-red-500 animate-pulse" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Excluindo Planilha</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">{deleteStatus.message}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Progresso da Operação</span>
                                    <span>{deleteStatus.progress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full p-0.5 shadow-inner">
                                    <div 
                                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-300 shadow-sm"
                                        style={{ width: `${deleteStatus.progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <p className="text-[10px] font-bold text-slate-400 bg-slate-50 py-2 px-4 rounded-xl border border-slate-100 inline-block uppercase tracking-tighter">
                                    Esta ação não pode ser desfeita
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestSettings;
