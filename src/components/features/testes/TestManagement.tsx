import React, { useState, useRef } from 'react';
import { Beaker, Upload, X, ChevronDown, ChevronUp, AlertCircle, Loader2, FileSpreadsheet, CheckCircle2, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExcelTestRecord } from '../../../types';

const TestManagement: React.FC = () => {
    const [tests, setTests] = useState<ExcelTestRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Validate if sheet structure goes from A to V minimum
                const ref = worksheet['!ref'];
                if (!ref) throw new Error("A planilha está vazia.");
                
                const range = XLSX.utils.decode_range(ref);
                // A = 0, V = 21
                if (range.e.c < 21) {
                    throw new Error("Estrutura da planilha incompatível. Ela precisa conter as colunas de A até V.");
                }
                
                const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
                
                if (jsonData.length === 0) {
                    throw new Error("A planilha não contém dados.");
                }

                let rawRows = jsonData;
                // Ignorar a primeira linha se for o cabeçalho
                if (rawRows.length > 0) {
                    const firstRow = rawRows[0];
                    if (String(firstRow[11] || '').trim().toLowerCase().includes('teste id') || 
                        String(firstRow[0] || '').trim().toLowerCase().includes('replicar a redação')) {
                        rawRows = rawRows.slice(1);
                    }
                }

                const validRows = rawRows.filter(row => row.some(cell => cell !== ''));

                const records: ExcelTestRecord[] = validRows.map(row => ({
                    id: crypto.randomUUID(),
                    stepsText: String(row[0] || ''),
                    browser: String(row[1] || ''),
                    bank: String(row[2] || ''),
                    backoffice: String(row[3] || ''),
                    mobile: String(row[4] || ''),
                    analyst: String(row[5] || ''),
                    automated: String(row[6] || ''),
                    bcsCode: String(row[7] || ''),
                    useCase: String(row[8] || ''),
                    minimum: String(row[9] || ''),
                    priority: String(row[10] || ''),
                    testId: String(row[11] || ''),
                    module: String(row[12] || ''),
                    objective: String(row[13] || ''),
                    estimatedTime: String(row[14] || ''),
                    prerequisite: String(row[15] || ''),
                    description: String(row[16] || ''),
                    acceptanceCriteria: String(row[17] || ''),
                    result: String(row[18] || ''),
                    errorStatus: String(row[19] || ''),
                    observation: String(row[20] || ''),
                    gap: String(row[21] || '')
                }));

                setTests(records);
            } catch (err: any) {
                console.error("Erro ao processar planilha:", err);
                setError(err.message || "Ocorreu um erro ao processar o arquivo. Verifique se é um arquivo Excel válido.");
                setTests([]);
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

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const clearTests = () => {
        if (window.confirm("Limpar todos os testes importados?")) {
            setTests([]);
            setError(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-8 relative">
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
                                {tests.length > 0 ? `${tests.length} casos de teste carregados.` : 'Importe sua planilha de cenários de teste.'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {tests.length > 0 && (
                            <button
                                onClick={clearTests}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Limpar
                            </button>
                        )}
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
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            {isLoading ? 'Lendo...' : 'Importar Excel'}
                        </button>
                    </div>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-red-800">Falha na importação</h4>
                            <p className="text-sm text-red-600 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Estado Zero */}
                {!isLoading && tests.length === 0 && !error && (
                    <div className="text-center py-16 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">Nenhum teste carregado</h3>
                        <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
                            Faça o upload de uma planilha Excel contendo seus casos de teste. 
                            Certifique-se de que a estrutura dos dados vai da coluna A até a coluna V.
                        </p>
                        <button
                            onClick={triggerFileInput}
                            className="mt-6 px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                        >
                            Selecionar Arquivo
                        </button>
                    </div>
                )}

                {/* Lista de Testes */}
                {tests.length > 0 && (
                    <div className="space-y-3">
                        {tests.map((test) => {
                            const isExpanded = expandedId === test.id;
                            return (
                                <div key={test.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow transition-shadow">
                                    {/* Cabeçalho do Card */}
                                    <div 
                                        className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                        onClick={() => toggleExpand(test.id)}
                                    >
                                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-6 gap-4 items-center">
                                            {/* Test ID */}
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</span>
                                                <span className="text-sm font-medium text-slate-900">{test.testId || '--'}</span>
                                            </div>
                                            {/* Banco */}
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Banco</span>
                                                <span className="text-sm text-slate-700 truncate">{test.bank || '--'}</span>
                                            </div>
                                            {/* Backoffice */}
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backoffice</span>
                                                <span className="text-sm text-slate-700 truncate">{test.backoffice || '--'}</span>
                                            </div>
                                            {/* Módulo */}
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Módulo</span>
                                                <span className="text-sm text-slate-700 truncate" title={test.module}>{test.module || '--'}</span>
                                            </div>
                                            {/* Analista */}
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Analista</span>
                                                <span className="text-sm text-slate-700 truncate">{test.analyst || '--'}</span>
                                            </div>
                                            {/* Prioridade */}
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prioridade</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                                                        test.priority.toLowerCase().includes('alta') ? 'bg-red-50 text-red-700 border-red-200' :
                                                        test.priority.toLowerCase().includes('média') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                        {test.priority || 'Normal'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 shrink-0">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                    </div>

                                    {/* Conteúdo Expandido */}
                                    {isExpanded && (
                                        <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Coluna Esquerda */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                                                        <ShieldAlert className="w-4 h-4 text-indigo-500" />
                                                        Objetivo
                                                    </h4>
                                                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap">
                                                        {test.objective || 'Não especificado.'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                                        Pré-requisitos
                                                    </h4>
                                                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap">
                                                        {test.prerequisite || 'Nenhum pré-requisito.'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Coluna Direita */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                                                        <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                                                        Descrição
                                                    </h4>
                                                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap">
                                                        {test.description || 'Não especificada.'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1.5">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        Critérios de Aceitação
                                                    </h4>
                                                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-600 shadow-sm whitespace-pre-wrap">
                                                        {test.acceptanceCriteria || 'Não especificados.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestManagement;

