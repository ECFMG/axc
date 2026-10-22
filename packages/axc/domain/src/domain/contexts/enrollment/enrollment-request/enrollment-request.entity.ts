import type { DomainSeedwork } from '../../../seedwork/index.ts';

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** One audit-trail row. `fromStatus` is null for the entry written when the request is created. */
export interface StatusHistoryEntry {
	readonly fromStatus: EnrollmentRequestStatus | null;
	readonly toStatus: EnrollmentRequestStatus;
	readonly changedAt: Date;
	readonly changedBy: string;
	readonly reason: string | null;
}

export interface EnrollmentRequestProps extends DomainSeedwork.DomainEntityProps {
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	statusHistory: StatusHistoryEntry[];
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly schemaVersion: string;
}

export interface EnrollmentRequestEntityReference extends Readonly<EnrollmentRequestProps> {}
