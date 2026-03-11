import React, { useState, useRef, useEffect } from 'react';
import { Settings, ChevronLeft, Upload, Loader2, FileSpreadsheet, AlertCircle, Check, Square, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/services/supabaseClient';
import { User, ExcelTestRecord, TestColumnKey, TestColumnSettings, DEFAULT_COLUMN_SETTINGS, DEFAULT_COLUMN_ORDER } from '../../../types';

interface TestSettingsProps {
    onClose: () => void;
    user: User;
    onUpdateSettings: (settings: TestColumnSettings) => Promise<void>;
}

// Labels for internal columns
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

const TestSettings: React.FC<TestSettingsProps> = ({ onClose, user, onUpdateSettings }) => {
    // --- File Input State ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Fallback to determine if tests are loaded
    const [hasLoadedTests, setHasLoadedTests] = useState(false);

    // --- Column Visibility State ---
    const [settings, setSettings] = useState<TestColumnSettings>(() => {
        const initial = user.testColumnSettings || DEFAULT_COLUMN_SETTINGS;
        return {
            ...initial,
            order: initial.order || DEFAULT_COLUMN_ORDER
        };
    });
    const [isSaving, setIsSaving] = useState(false);

    // Persist checks locally across renders / localStorage fallback
    useEffect(() => {
        const checkTests = async () => {
            const { count } = await supabase
                .from('excel_test_records')
                .select('*', { count: 'exact', head: true });
            
            setHasLoadedTests(!!count && count > 0);
        };
        checkTests();
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
            
            // Allow moving across the visible/ordered items
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
            await onUpdateSettings(settings); // Send to App.tsx
            // Visual feedback could be added here
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
                    analyst: '', // Empty on root import
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
                    result: 'Pendente', // Forced status
                    error_status: String(row[19] || ''),
                    observation: String(row[20] || ''),
                    gap: String(row[21] || ''),
                    imported_order: index, // Fixed sorting reference
                    created_by: user.id
                }));

                // Clear old tests first for current user, or just app-wide? Usually user imports for themselves
                // For this implementation let's clear all records created by this user
                await supabase.from('excel_test_records').delete().eq('created_by', user.id);

                // Insert into Supabase
                const { error: insertError } = await supabase
                    .from('excel_test_records')
                    .insert(records);

                if (insertError) throw insertError;

                setHasLoadedTests(true);
                alert(`${records.length} registro(s) importados com sucesso.`);
            } catch (err: any) {
                console.error("Erro ao processar planilha:", err);
                setError(err.message || "Ocorreu um erro ao processar o arquivo. Verifique se é um arquivo Excel válido.");
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            setError("Erro ao ler o arquivo.");
            setIsLoading(false);
        };

        reader.readAsArrayBuffer(file);
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const clearTests = async () => {
        if (window.confirm("Limpar todos os testes importados?")) {
            setIsLoading(true);
            try {
                await supabase.from('excel_test_records').delete().eq('created_by', user.id);
                setHasLoadedTests(false);
                setError(null);
            } catch (err) {
                console.error("Erro ao limpar testes:", err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold text-xs mr-2 p-2 rounded-lg hover:bg-white transition-all shadow-sm border border-transparent hover:border-slate-200"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shadow-inner shrink-0">
                        <Settings className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Configurações de Testes</h2>
                        <p className="text-sm text-slate-500 font-medium">Configure a visualização e fonte de dados</p>
                    </div>
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda: Ações principais */}
                <div className="space-y-8">
                    {/* Seção de Importação */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">Gestão de Dados</h3>
                        </div>
                        
                        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                            <div className="flex items-start gap-3">
                                <FileSpreadsheet className="w-6 h-6 text-indigo-500 shrink-0" />
                                <div>
                                    <h5 className="text-sm font-bold text-slate-800">Importar Planilha</h5>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Faça upload de um arquivo .xlsx contendo seus casos de teste. O sistema mapeará automaticamente as colunas de A até V.
                                    </p>
                                </div>
                            </div>
                            
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            
                            {error && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                    <p className="text-xs font-medium text-red-800 leading-relaxed">{error}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    onClick={triggerFileInput}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    {isLoading ? 'Importando...' : 'Selecionar Arquivo Excel'}
                                </button>
                                
                                {hasLoadedTests && (
                                    <button
                                        onClick={clearTests}
                                        className="w-full px-4 py-3 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
                                    >
                                        Limpar Base Local
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Block - Save */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <button
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Check className="w-5 h-5" />
                            )}
                            {isSaving ? 'Salvando...' : 'Salvar Configurações e Voltar'}
                        </button>
                    </div>
                </div>

                {/* Coluna Direita: Checkboxes */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-6">
                        <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">Configuração de Exibição</h3>
                        <p className="text-xs text-slate-500 font-medium">Selecione as colunas que aparecerão na tela</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(settings.order || DEFAULT_COLUMN_ORDER)
                            .filter(key => ![
                                'estimatedTime', 'errorStatus', 'observation', 'gap',
                                'objective', 'prerequisite', 'description', 'acceptanceCriteria'
                            ].includes(key))
                            .map((key, index, arr) => {
                            const isChecked = settings[key];
                            return (
                                <div key={key} className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                                    isChecked 
                                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                                        : 'bg-white border-slate-200'
                                }`}>
                                    <button
                                        onClick={() => handleToggleColumn(key)}
                                        className="flex-1 flex items-center gap-3 text-left group"
                                    >
                                        <div className={`flex items-center justify-center w-5 h-5 rounded flex-shrink-0 transition-colors ${
                                            isChecked ? 'bg-indigo-600 text-white' : 'border-2 border-slate-300 text-transparent group-hover:border-slate-400'
                                        }`}>
                                            <Check className={`w-3.5 h-3.5 ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                                        </div>
                                        <span className={`text-sm tracking-tight line-clamp-1 ${isChecked ? 'font-semibold text-indigo-900' : 'font-medium text-slate-600'}`}>
                                            {COLUMN_LABELS[key as TestColumnKey]}
                                        </span>
                                    </button>
                                    
                                    <div className="flex flex-col gap-1 border-l border-slate-200 pl-2">
                                        <button 
                                            onClick={(e) => handleMoveColumn(key, 'up', e)}
                                            disabled={index === 0}
                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                            title="Mover para cima"
                                        >
                                            <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleMoveColumn(key, 'down', e)}
                                            disabled={index === arr.length - 1}
                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                            title="Mover para baixo"
                                        >
                                            <ArrowDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestSettings;
