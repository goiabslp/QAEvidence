import React from 'react';
import EvidenceForm from './../evidence/EvidenceForm';
import { useTicketContext } from './TicketLayout';

const TicketInfoPage: React.FC = () => {
    const { 
        evidences, 
        ticketInfo, 
        wizardTrigger, 
        invalidFields, 
        isGeneratingPdf, 
        isSaving,
        onTicketInfoChange,
        onWizardSave,
        onClearTrigger,
        onEditCase,
        formRef
    } = useTicketContext();

    // App.tsx passed onAdd to EvidenceForm, we map it to onSubmit to avoid TS errors
    // and match EvidenceFormProps
    return (
        <EvidenceForm
            key={ticketInfo?.ticketId || 'new'}
            ref={formRef}
            evidences={evidences}
            onSubmit={() => {}} // Not used directly for ticket info saving
            initialTicketInfo={ticketInfo}
            wizardTrigger={wizardTrigger}
            onWizardSave={onWizardSave}
            onClearTrigger={onClearTrigger}
            invalidFields={invalidFields}
            onTicketInfoChange={onTicketInfoChange}
            onEditCase={onEditCase}
        />
    );
};

export default TicketInfoPage;
