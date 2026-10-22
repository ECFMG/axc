import type { DataSources } from '@axc/persistence';

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StatusHistoryEntryView {
	fromStatus: EnrollmentRequestStatus | null;
	toStatus: EnrollmentRequestStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequestView {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntryView[];
}

export type EnrollmentRequestErrorCode = 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

export interface EnrollmentRequestError {
	code: EnrollmentRequestErrorCode;
	message: string;
	details?: Array<{ field: string; message: string }>;
}

export type EnrollmentRequestResult = { ok: true; value: EnrollmentRequestView } | { ok: false; error: EnrollmentRequestError };

export interface EnrollmentRequestGetByIdCommand {
	id: string;
}

/** Shape shared by the read model and the aggregate, so reads and writes return the same view. */
interface EnrollmentRequestSource {
	readonly id: string;
	readonly courseId: string;
	readonly learnerEmail: string;
	readonly justification: string;
	readonly status: EnrollmentRequestStatus;
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly statusHistory: ReadonlyArray<{ fromStatus: EnrollmentRequestStatus | null; toStatus: EnrollmentRequestStatus; changedAt: Date; changedBy: string; reason: string | null }>;
}

export const toEnrollmentRequestView = (source: EnrollmentRequestSource): EnrollmentRequestView => ({
	id: source.id,
	courseId: source.courseId,
	learnerEmail: source.learnerEmail,
	justification: source.justification,
	status: source.status,
	createdAt: source.createdAt.toISOString(),
	updatedAt: source.updatedAt.toISOString(),
	statusHistory: source.statusHistory.map((entry) => ({ ...entry, changedAt: entry.changedAt.toISOString() })),
});

export const enrollmentRequestNotFound = (id: string): EnrollmentRequestResult => ({ ok: false, error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND', message: `Enrollment request ${id} was not found.` } });

export const getById = (dataSources: DataSources) => {
	return async (command: EnrollmentRequestGetByIdCommand): Promise<EnrollmentRequestResult> => {
		const request = await dataSources.readonlyDataSource.Enrollment.EnrollmentRequest.EnrollmentRequestReadRepo.getById(command.id);
		return request ? { ok: true, value: toEnrollmentRequestView(request) } : enrollmentRequestNotFound(command.id);
	};
};
