import React from 'react';
import { useTicketContext } from './TicketLayout';
import EvidenceList from '../evidence/EvidenceList';
import TestScenarioWizard from '../wizard/TestScenarioWizard';
import { Layers } from 'lucide-react';

const TicketScenariosPage: React.FC = () => {
    const { 
        evidences, 
        ticketInfo,
        wizardTrigger,
        onWizardSave,
        onClearTrigger,
        onAddCase,
        onEditCase,
        onCopyCase,
        onDeleteEvidence,
        onDeleteScenario,
        onEditScenarioTitle
    } = useTicketContext();

    return (
        <div className="space-y-6 pb-20">
            {/* Lista de Evidências */}
            {evidences.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-slide-up">
                    <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="w-full">
                            <EvidenceList
                                evidences={evidences}
                                onDelete={onDeleteEvidence}
                                onAddCase={onAddCase}
                                onEditCase={onEditCase}
                                onCopyCase={onCopyCase}
                                onDeleteScenario={onDeleteScenario}
                                onEditScenarioTitle={onEditScenarioTitle}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <Layers className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhum Cenário Criado</h3>
                    <p className="text-slate-500 max-w-md">
                        Comece adicionando um novo cenário de teste para este chamado usando o assistente abaixo.
                    </p>
                </div>
            )}

            {/* Assistente de Criação de Cenários */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <TestScenarioWizard
                    onSave={onWizardSave}
                    baseTicketInfo={ticketInfo || undefined}
                    wizardTrigger={wizardTrigger}
                    onClearTrigger={onClearTrigger}
                    existingEvidences={evidences}
                />
            </div>
        </div>
    );
};

export default TicketScenariosPage;
