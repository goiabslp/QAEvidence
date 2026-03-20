import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Save, Beaker } from 'lucide-react';
import { ExcelTestRecord, TicketPriority } from '../../../types';
import ModernSelect from '../../common/ModernSelect';

interface ManualTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (testData: Partial<ExcelTestRecord>) => void;
    nextIdNumber: number;
}

const ManualTestModal: React.FC<ManualTestModalProps> = ({ isOpen, onClose, onSave, nextIdNumber }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Initial State excluding "ignored" and "auto-generated" statuses
    const [formData, setFormData] = useState<Partial<ExcelTestRecord>>({
        bank: '',
        backoffice: '',
        useCase: '',
        minimum: '',
        priority: 'Média',
        testId: '', // Will be auto-generated later
        module: '',
        objective: '',
        prerequisite: '',
        description: '',
        acceptanceCriteria: '',
        
        // Advanced
        stepsText: '',
        browser: '',
        mobile: '',
        automated: '',
        bcsCode: '',
        estimatedTime: '',
    });

    if (!isOpen) return null;

    const handleInputChange = (field: keyof ExcelTestRecord, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        // Validation could go here if needed
        // Generate automatic TAG ID (e.g., TST-A1B2C3)
        const generateTagId = () => {
            return `QA-${String(nextIdNumber).padStart(5, '0')}`;
        };

        const finalData = {
            ...formData,
            testId: generateTagId(), // Generate Unique TAG ID automatically on save
            // Set defaults for ignored fields
            analyst: '',
            result: 'Pendente',
            errorStatus: '',
            observation: '',
            gap: ''
        };

        onSave(finalData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Beaker className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Novo Teste</h2>
                            <p className="text-xs font-medium text-slate-500">Inclusão manual de registro</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-white custom-scrollbar">
                    
                    {/* Campos Principais */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Campos Principais</h3>
                            <div className="h-px flex-1 bg-slate-100"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Banco</label>
                                <input value={formData.bank} onChange={e => handleInputChange('bank', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="Ex: Banco 01" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Backoffice</label>
                                <input value={formData.backoffice} onChange={e => handleInputChange('backoffice', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="Ex: RM, Protheus" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Use Case</label>
                                <input value={formData.useCase} onChange={e => handleInputChange('useCase', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="Ex: UC-001" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Mínimo</label>
                                <input value={formData.minimum} onChange={e => handleInputChange('minimum', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="Ex: Sim, Não" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Prioridade</label>
                                <ModernSelect 
                                    options={['Alta', 'Média', 'Baixa']}
                                    value={formData.priority || 'Média'}
                                    onChange={val => handleInputChange('priority', val)}
                                    placeholder="Prioridade"
                                    field="priority"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase flex gap-2 items-center">
                                    Teste ID (TAG ID)
                                </label>
                                <div className="w-full px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 text-sm font-black select-none">
                                    QA-{String(nextIdNumber).padStart(5, '0')}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Módulo</label>
                            <input value={formData.module} onChange={e => handleInputChange('module', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="Módulo do sistema" />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Objetivo</label>
                            <input value={formData.objective} onChange={e => handleInputChange('objective', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="Objetivo principal do teste" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Pré-requisito</label>
                            <textarea value={formData.prerequisite} onChange={e => handleInputChange('prerequisite', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm min-h-[60px]" placeholder="Condições prévias" />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Descrição</label>
                            <textarea value={formData.description} onChange={e => handleInputChange('description', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm min-h-[80px]" placeholder="Descrição do caso" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Critérios de Aceitação</label>
                            <textarea value={formData.acceptanceCriteria} onChange={e => handleInputChange('acceptanceCriteria', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm min-h-[80px]" placeholder="Critérios para aprovação" />
                        </div>
                    </div>

                    {/* Campos Avançados Toggle */}
                    <div>
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-2"
                        >
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {showAdvanced ? "Ocultar Campos Avançados" : "Exibir Campos Avançados"}
                        </button>
                        
                        {showAdvanced && (
                            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Passos (Steps)</label>
                                    <textarea value={formData.stepsText} onChange={e => handleInputChange('stepsText', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[80px]" />
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Navegador (Browser)</label>
                                        <input value={formData.browser} onChange={e => handleInputChange('browser', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Mobile</label>
                                        <input value={formData.mobile} onChange={e => handleInputChange('mobile', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Automatizado</label>
                                    <input value={formData.automated} onChange={e => handleInputChange('automated', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Código BCSChamados</label>
                                    <input value={formData.bcsCode} onChange={e => handleInputChange('bcsCode', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Tempo Estimado</label>
                                    <input value={formData.estimatedTime} onChange={e => handleInputChange('estimatedTime', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Ex: 30m, 1h" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2.5 flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Novo Teste
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualTestModal;
