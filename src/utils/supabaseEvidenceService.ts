import { supabase } from '@/services/supabaseClient';
import { ArchivedTicket, EvidenceItem, TestCaseDetails, TicketInfo, TestStatus, Severity, TicketPriority, TicketStatus } from '@/types';

/**
 * Ensures a value is a string, converting null/undefined to empty string.
 */
const safeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
};

export const saveEvidenceToSupabase = async (ticket: ArchivedTicket): Promise<boolean> => {
    try {
        // 1. Insert into `evidences` table
        const evidenceData = {
            id: ticket.id,
            ticket_id: safeString(ticket.ticketInfo.ticketId),
            sprint: safeString(ticket.ticketInfo.sprint),
            is_improvement: Boolean(ticket.ticketInfo.isImprovement),
            ticket_title: safeString(ticket.ticketInfo.ticketTitle),
            ticket_summary: safeString(ticket.ticketInfo.ticketSummary),
            client_system: safeString(ticket.ticketInfo.clientSystem),
            requester: safeString(ticket.ticketInfo.requester),
            analyst: safeString(ticket.ticketInfo.analyst),
            request_date: safeString(ticket.ticketInfo.requestDate),
            priority: safeString(ticket.ticketInfo.priority),
            error_origin: safeString(ticket.ticketInfo.errorOrigin),
            ticket_status: safeString(ticket.ticketInfo.ticketStatus),
            environment: safeString(ticket.ticketInfo.environment),
            environment_version: safeString(ticket.ticketInfo.environmentVersion),
            evidence_date: safeString(ticket.ticketInfo.evidenceDate),
            ticket_description: safeString(ticket.ticketInfo.ticketDescription),
            solution: safeString(ticket.ticketInfo.solution),
            blockage_reason: safeString(ticket.ticketInfo.blockageReason),
            created_by: safeString(ticket.createdBy),
            archived_at: ticket.archivedAt
        };

        const { error: evidenceError } = await supabase.from('evidences').upsert(evidenceData);
        if (evidenceError) throw evidenceError;

        // Insert blockage images if any
        if (ticket.ticketInfo.blockageImageUrls && ticket.ticketInfo.blockageImageUrls.length > 0) {
            const blockageImagesData = ticket.ticketInfo.blockageImageUrls.map((imageUrl) => ({
                evidence_id: ticket.id,
                image_type: 'blockage',
                image_data: imageUrl
            }));

            const { error: blockageImagesError } = await supabase.from('evidence_images').insert(blockageImagesData);
            if (blockageImagesError) throw blockageImagesError;
        }

        // 2. Insert into `evidence_cases` and `evidence_images`
        for (const item of ticket.items) {
            const caseData = {
                id: item.id,
                evidence_id: ticket.id,
                title: safeString(item.title),
                description: safeString(item.description),
                status: safeString(item.status),
                severity: safeString(item.severity),
                created_at: item.timestamp,
                // Optional TestCaseDetails
                scenario_number: item.testCaseDetails?.scenarioNumber || null,
                case_number: item.testCaseDetails?.caseNumber || null,
                case_id: safeString(item.testCaseDetails?.caseId),
                screen: safeString(item.testCaseDetails?.screen),
                result: safeString(item.testCaseDetails?.result),
                objective: safeString(item.testCaseDetails?.objective),
                pre_requisite: safeString(item.testCaseDetails?.preRequisite),
                condition: safeString(item.testCaseDetails?.condition),
                expected_result: safeString(item.testCaseDetails?.expectedResult),
                failure_reason: safeString(item.testCaseDetails?.failureReason)
            };

            const { error: caseError } = await supabase.from('evidence_cases').upsert(caseData);
            if (caseError) throw caseError;

            // Insert case main image
            if (item.imageUrl) {
                const { error: itemImageError } = await supabase.from('evidence_images').insert({
                    evidence_id: ticket.id,
                    case_id: item.id,
                    image_type: 'case',
                    image_data: item.imageUrl
                });
                if (itemImageError) throw itemImageError;
            }

            // Insert steps images if any
            if (item.testCaseDetails?.steps && item.testCaseDetails.steps.length > 0) {
                for (const step of item.testCaseDetails.steps) {
                    if (step.imageUrl) {
                        const { error: stepImageError } = await supabase.from('evidence_images').insert({
                            evidence_id: ticket.id,
                            case_id: item.id,
                            image_type: 'step',
                            step_number: step.stepNumber,
                            step_description: safeString(step.description),
                            image_data: step.imageUrl
                        });
                        if (stepImageError) throw stepImageError;
                    }
                }
            }
        }

        return true;
    } catch (error: any) {
        console.error('Error saving evidence to Supabase detalhado:', error.message || error);
        return false;
    }
};

export const fetchEvidencesFromSupabase = async (): Promise<ArchivedTicket[]> => {
    try {
        const { data: evidences, error: evidencesError } = await supabase
            .from('evidences')
            .select(`
        *,
        evidence_cases (
          *
        ),
        evidence_images (
          *
        )
      `)
            .order('archived_at', { ascending: false });

        if (evidencesError) throw evidencesError;

        if (!evidences) return [];

        const archivedTickets: ArchivedTicket[] = evidences.map((ev: any) => {
            // Reconstruct TicketInfo
            const ticketInfo: TicketInfo = {
                ticketId: ev.ticket_id,
                sprint: ev.sprint,
                isImprovement: ev.is_improvement,
                ticketTitle: ev.ticket_title,
                ticketSummary: ev.ticket_summary,
                clientSystem: ev.client_system,
                requester: ev.requester,
                analyst: ev.analyst,
                requestDate: ev.request_date,
                priority: (ev.priority as TicketPriority) || TicketPriority.MEDIUM,
                errorOrigin: ev.error_origin,
                ticketStatus: (ev.ticket_status as TicketStatus) || TicketStatus.PENDING,
                environment: ev.environment,
                environmentVersion: ev.environment_version,
                evidenceDate: ev.evidence_date,
                ticketDescription: ev.ticket_description,
                solution: ev.solution,
                blockageReason: ev.blockage_reason || undefined,
                blockageImageUrls: ev.evidence_images
                    ? ev.evidence_images.filter((img: any) => img.image_type === 'blockage').map((img: any) => img.image_data)
                    : undefined
            };

            // Reconstruct EvidenceItems
            const items: EvidenceItem[] = (ev.evidence_cases || []).map((c: any) => {
                let testCaseDetails: TestCaseDetails | undefined = undefined;

                if (c.case_id) {
                    // Find step images for this case
                    const stepImages = ev.evidence_images
                        ? ev.evidence_images.filter((img: any) => img.image_type === 'step' && img.case_id === c.id)
                        : [];

                    const steps = stepImages.map((img: any) => ({
                        stepNumber: img.step_number,
                        description: img.step_description,
                        imageUrl: img.image_data
                    }));

                    testCaseDetails = {
                        scenarioNumber: c.scenario_number,
                        caseNumber: c.case_number,
                        caseId: c.case_id,
                        screen: c.screen,
                        result: c.result as 'Sucesso' | 'Falha' | 'Impedimento' | 'Pendente',
                        objective: c.objective,
                        preRequisite: c.pre_requisite,
                        condition: c.condition,
                        expectedResult: c.expected_result,
                        failureReason: c.failure_reason,
                        steps: steps.length > 0 ? steps : undefined
                    };
                }

                const caseImage = ev.evidence_images
                    ? ev.evidence_images.find((img: any) => img.image_type === 'case' && img.case_id === c.id)
                    : null;

                return {
                    id: c.id,
                    title: c.title,
                    description: c.description,
                    imageUrl: caseImage ? caseImage.image_data : null,
                    status: c.status as TestStatus,
                    severity: c.severity as Severity,
                    timestamp: c.created_at,
                    ticketInfo: { ...ticketInfo }, // Duplicate ticketInfo for each item as per type structure
                    testCaseDetails,
                    createdBy: ev.created_by
                } as EvidenceItem;
            });

            return {
                id: ev.id,
                ticketInfo,
                items,
                archivedAt: ev.archived_at,
                createdBy: ev.created_by
            };
        });

        return archivedTickets;
    } catch (error) {
        console.error('Error fetching evidences from Supabase:', error);
        return [];
    }
};
export const deleteEvidenceFromSupabase = async (evidenceId: string): Promise<boolean> => {
    try {
        // Since we have foreign keys (hopefully with ON DELETE CASCADE), 
        // deleting from `evidences` should clean up `evidence_cases` and `evidence_images`.
        // If not, we should delete them manually.

        // Manual cleanup just in case Cascade is not set up:
        await supabase.from('evidence_images').delete().eq('evidence_id', evidenceId);
        await supabase.from('evidence_cases').delete().eq('evidence_id', evidenceId);

        const { error } = await supabase
            .from('evidences')
            .delete()
            .eq('id', evidenceId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting evidence from Supabase:', error);
        return false;
    }
};
