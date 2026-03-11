import React, { useState, useRef, useEffect } from 'react';
import { Settings, ChevronLeft, Upload, Loader2, FileSpreadsheet, AlertCircle, Check, Square, ArrowUp, ArrowDown, LayoutDashboard, Target, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/services/supabaseClient';
import { User, ExcelTestRecord, TestColumnKey, TestColumnSettings, DEFAULT_COLUMN_SETTINGS, DEFAULT_COLUMN_ORDER } from '../../../types';
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

    // Initial check + fetch for Dashboards
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoadingRecords(true);
            try {
                const { data, count, error } = await supabase
                    .from('excel_test_records')
                    .select('*', { count: 'exact' });
                
                if (error) throw error;

                const settingsRecord = data?.find(r => r.module === 'SYSTEM_SETTINGS');
                if (settingsRecord) {
                    setCurrentSheetName(settingsRecord.steps_text || 'Gestão de Testes');
                }

                // Filter out settings for the test list
                const actualData = data?.filter(r => r.module !== 'SYSTEM_SETTINGS') || [];
                const hasRecords = actualData.length > 0;
                setHasLoadedTests(hasRecords);

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
        fetchAllData();
    }, []);

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

        setIsLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
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

                const records = validRows.map((row, index) => ({
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
                    test_id: String(row[11] || ''),
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
                    imported_order: index, 
                    created_by: user.id
                }));

                setPendingRecords(records);
                setNewSheetName('');
                setError(null);
            } catch (err: any) {
                console.error("Erro ao processar planilha:", err);
                setError(err.message || "Ocorreu um erro ao processar o arquivo.");
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const confirmImport = async () => {
        if (!pendingRecords || !newSheetName.trim()) {
            alert("Por favor, preencha o nome da planilha.");
            return;
        }

        setIsLoading(true);
        try {
            // Delete old tests (keep settings)
            await supabase.from('excel_test_records')
                .delete()
                .neq('module', 'SYSTEM_SETTINGS');

            // Insert new tests
            const { error: insertError } = await supabase
                .from('excel_test_records')
                .insert(pendingRecords);

            if (insertError) throw insertError;

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
            setHasLoadedTests(true);
            setPendingRecords(null);
            alert(`${pendingRecords.length} registro(s) importados com sucesso.`);
            
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
        } catch (err: any) {
            console.error("Erro ao finalizar importação:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
        if (window.confirm("Limpar TODOS os testes importados em toda a plataforma?")) {
            setIsLoading(true);
            try {
                await supabase.from('excel_test_records').delete().neq('module', 'SYSTEM_SETTINGS');
                setHasLoadedTests(false);
                setTestRecords([]);
                setError(null);
            } catch (err) {
                console.error("Erro ao limpar testes:", err);
            } finally {
                setIsLoading(false);
            }
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
            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'DATA' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-2xl mx-auto">
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                                Gestão de Planilhas
                            </h3>
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                        <Upload className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-1">Importação Mestra</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                            Faça upload de um arquivo `.xlsx` contendo os casos. O sistema mapeará automaticamente as colunas de A até V.
                                        </p>
                                        
                                        {!pendingRecords ? (
                                            <>
                                                <input
                                                    type="file"
                                                    accept=".xlsx, .xls"
                                                    className="hidden"
                                                    ref={fileInputRef}
                                                    onChange={handleFileUpload}
                                                />
                                                <button
                                                    onClick={triggerFileInput}
                                                    disabled={isLoading}
                                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                                                >
                                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                    {isLoading ? 'Lendo Arquivo...' : 'Selecionar Planilha'}
                                                </button>
                                            </>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <div className="p-4 bg-white border-2 border-indigo-100 rounded-xl shadow-inner">
                                                    <label className="text-xs font-black text-indigo-600 uppercase mb-2 block tracking-wider">Nome da Planilha (Obrigatório)</label>
                                                    <input 
                                                        type="text"
                                                        value={newSheetName}
                                                        onChange={(e) => setNewSheetName(e.target.value)}
                                                        placeholder="Ex: Sprint 42 - Core"
                                                        className="w-full px-4 py-2 text-sm font-bold text-slate-700 bg-indigo-50/30 border border-indigo-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={confirmImport}
                                                        disabled={isLoading || !newSheetName.trim()}
                                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                                                    >
                                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        Confirmar Importação
                                                    </button>
                                                    <button
                                                        onClick={() => setPendingRecords(null)}
                                                        disabled={isLoading}
                                                        className="px-6 py-3 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section to Edit Current Sheet Name */}
                                {hasLoadedTests && !pendingRecords && (
                                    <div className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-2xl flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white border border-indigo-100 flex items-center justify-center shrink-0">
                                            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 mb-1">Nome Atual da Planilha</h4>
                                            <div className="flex gap-2 mt-3">
                                                <input 
                                                    type="text"
                                                    defaultValue={currentSheetName}
                                                    onBlur={(e) => handleUpdateSheetName(e.target.value)}
                                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 italic">A alteração reflete imediatamente na listagem de testes para todos.</p>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-800">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <p className="text-sm font-medium">{error}</p>
                                    </div>
                                )}

                                {hasLoadedTests && (
                                    <div className="p-6 bg-red-50 border border-red-100 rounded-2xl">
                                        <h4 className="font-bold text-red-800 mb-1 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Ações Perigosas
                                        </h4>
                                        <p className="text-sm text-red-600/80 mb-4">
                                            Aviso: Limpar a base local exclui todos os registros do repositório compartilhado para todos os analistas.
                                        </p>
                                        <button
                                            onClick={clearTests}
                                            className="flex items-center justify-center gap-2 px-6 py-3 font-bold text-red-600 bg-white border border-red-200 hover:bg-red-100 rounded-xl transition-colors shadow-sm"
                                        >
                                            Limpar Bando de Testes Global
                                        </button>
                                    </div>
                                )}
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
        </div>
    );
};

export default TestSettings;
