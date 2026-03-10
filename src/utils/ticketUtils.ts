import { EvidenceItem, TestStatus } from '@/types';
import { STATUS_CONFIG } from '@/constants';

export const getTicketAggregateStatus = (items: EvidenceItem[]) => {
    const hasFailure = items.some(i => i.status === TestStatus.FAIL);
    const hasBlocker = items.some(i => i.status === TestStatus.BLOCKED);
    const hasPending = items.some(i => i.status === TestStatus.PENDING || i.status === TestStatus.SKIPPED);

    if (hasFailure) return STATUS_CONFIG[TestStatus.FAIL];
    if (hasBlocker) return STATUS_CONFIG[TestStatus.BLOCKED];
    if (hasPending) return STATUS_CONFIG[TestStatus.SKIPPED]; // Use SKIPPED config which maps to Pendente/Clock
    return STATUS_CONFIG[TestStatus.PASS];
};

export const getTicketStatusBadges = (items: EvidenceItem[]) => {
    // RULE: If no items, return Pending
    if (!items || items.length === 0) {
        return [STATUS_CONFIG[TestStatus.PENDING]];
    }

    const statuses = new Set<TestStatus>();
    items.forEach(i => {
        if (i.status === TestStatus.SKIPPED) statuses.add(TestStatus.PENDING); // Normalize skipped to pending visually
        else statuses.add(i.status);
    });

    // If items exist but somehow no status recorded (unlikely given TS), fallback
    if (statuses.size === 0) {
        return [STATUS_CONFIG[TestStatus.PENDING]];
    }

    // Sort logic: Fail > Blocked > Pass > Pending
    const sortedStatuses = Array.from(statuses).sort((a, b) => {
        const order = { [TestStatus.FAIL]: 0, [TestStatus.BLOCKED]: 1, [TestStatus.PASS]: 2, [TestStatus.PENDING]: 3, [TestStatus.SKIPPED]: 3 };
        return (order[a as keyof typeof order] || 99) - (order[b as keyof typeof order] || 99);
    });

    return sortedStatuses.map(status => STATUS_CONFIG[status]);
};
