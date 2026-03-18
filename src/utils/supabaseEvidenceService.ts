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
                failure_reason: safeString(item.testCaseDetails?.failureReason),
                steps: item.testCaseDetails?.steps || []
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
          id, evidence_id, case_id, image_type
        )
      `)
            .order('archived_at', { ascending: false });

        if (evidencesError) throw evidencesError;

        if (!evidences) return [];

        const archivedTickets: ArchivedTicket[] = evidences.map((ev: any) => {
            // Reconstruct TicketInfo
            const ticketInfo: TicketInfo = {
                ticketId: safeString(ev.ticket_id),
                sprint: safeString(ev.sprint),
                isImprovement: Boolean(ev.is_improvement),
                ticketTitle: safeString(ev.ticket_title),
                ticketSummary: safeString(ev.ticket_summary),
                clientSystem: safeString(ev.client_system),
                requester: safeString(ev.requester),
                analyst: safeString(ev.analyst),
                requestDate: safeString(ev.request_date),
                priority: (ev.priority as TicketPriority) || TicketPriority.MEDIUM,
                errorOrigin: safeString(ev.error_origin),
                ticketStatus: (ev.ticket_status as TicketStatus) || TicketStatus.PENDING,
                environment: safeString(ev.environment),
                environmentVersion: safeString(ev.environment_version),
                evidenceDate: safeString(ev.evidence_date),
                ticketDescription: safeString(ev.ticket_description),
                solution: safeString(ev.solution),
                blockageReason: ev.blockage_reason || undefined,
                blockageImageUrls: [] // Images will be loaded on demand
            };

            // Reconstruct EvidenceItems
            const items: EvidenceItem[] = ev.evidence_cases.map((c: any) => {
                let testCaseDetails: TestCaseDetails | undefined = undefined;

                if (c.case_id) {
                    testCaseDetails = {
                        scenarioNumber: c.scenario_number || 0,
                        caseNumber: c.case_number || 0,
                        caseId: c.case_id || '',
                        screen: c.screen || '',
                        result: (c.result as any) || 'Pendente',
                        objective: c.objective || '',
                        preRequisite: c.pre_requisite || '',
                        condition: c.condition || '',
                        expectedResult: c.expected_result || '',
                        failureReason: c.failure_reason || undefined,
                        steps: c.steps || []
                    };
                }

                return {
                    id: c.id,
                    title: c.title || '',
                    description: c.description || '',
                    imageUrl: null, // Will be loaded on demand
                    status: (c.status as TestStatus) || TestStatus.PENDING,
                    severity: (c.severity as Severity) || Severity.MEDIUM,
                    timestamp: Number(c.created_at) || Date.now(),
                    ticketInfo: { ...ticketInfo },
                    testCaseDetails,
                    createdBy: ev.created_by || '',
                    images: [] // Will be loaded on demand
                } as EvidenceItem;
            });

            return {
                id: ev.id,
                ticketInfo,
                items,
                archivedAt: Number(ev.archived_at) || Date.now(),
                createdBy: safeString(ev.created_by)
            };
        });

        return archivedTickets;
    } catch (error: any) {
        console.error('Error fetching evidences from Supabase:', error);
        if (error.message) console.error('Error message:', error.message);
        if (error.details) console.error('Error details:', error.details);
        if (error.hint) console.error('Error hint:', error.hint);
        return [];
    }
};

/**
 * Fetches only the image data for a specific evidence ticket
 * Used for lazy loading images when a ticket is opened
 */
export const fetchEvidenceImages = async (evidenceId: string) => {
    try {
        // Step 1: Fetch metadata only (no image_data) to avoid timeout
        const { data: metadata, error: metadataError } = await supabase
            .from('evidence_images')
            .select('id, case_id, image_type, step_number, step_description')
            .eq('evidence_id', evidenceId);

        if (metadataError) throw metadataError;
        if (!metadata || metadata.length === 0) return [];

        // Step 2: Fetch image_data for each record individually in parallel
        // We do this to avoid "statement timeout" on large combined payloads
        const results = await Promise.all(metadata.map(async (meta) => {
            const { data: imageData, error: imageError } = await supabase
                .from('evidence_images')
                .select('image_data')
                .eq('id', meta.id)
                .single();
            
            if (!imageError && imageData) {
                return {
                    ...meta,
                    image_data: imageData.image_data
                };
            } else {
                console.error(`Error fetching image data for ID ${meta.id}:`, imageError);
                return { ...meta, image_data: null };
            }
        }));

        return results;
    } catch (error) {
        console.error("Error fetching evidence images:", error);
        throw error;
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
