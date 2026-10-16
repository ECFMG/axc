import type { ApplicationServices } from '@axc/application-services';

const requestStatuses = new Set(['pending', 'approved', 'rejected', 'cancelled']);
const listParameters = new Set(['status', 'courseId', 'learnerEmail']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EnrollmentResult = { status: 200 | 400 | 404 | 409; body: unknown };

interface EnrollmentView {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
	statusHistory: ReadonlyArray<{
		fromStatus: string | null;
		toStatus: string;
		changedAt: Date;
		changedBy: string;
		reason: string | null;
	}>;
}

const timestamp = (value: Date): string => value.toISOString();

const enrollmentBody = (request: EnrollmentView) => ({
	id: request.id,
	courseId: request.courseId,
	learnerEmail: request.learnerEmail,
	justification: request.justification,
	status: request.status,
	createdAt: timestamp(request.createdAt),
	updatedAt: timestamp(request.updatedAt),
	statusHistory: request.statusHistory.map((entry) => ({
		fromStatus: entry.fromStatus,
		toStatus: entry.toStatus,
		changedAt: timestamp(entry.changedAt),
		changedBy: entry.changedBy,
		reason: entry.reason,
	})),
});

const errorBody = (code: string, message: string, details: { field: string; message: string }[]) => ({
	error: { code, message, details },
});

const invalidRequest = (details: { field: string; message: string }[]): EnrollmentResult => ({
	status: 400,
	body: errorBody('INVALID_REQUEST', 'The request could not be completed.', details),
});

const domainError = (error: unknown): EnrollmentResult | undefined => {
	const code = error instanceof Error ? error.message : '';
	const details: { field: string; message: string }[] = [];
	if (code === 'COURSE_NOT_FOUND') {
		details.push({ field: 'courseId', message: 'No course exists with this id.' });
		return { status: 404, body: errorBody('COURSE_NOT_FOUND', 'The course was not found.', details) };
	}
	if (code === 'COURSE_NOT_ACTIVE') {
		details.push({ field: 'courseId', message: 'Enrollment requests can only be created for an active course.' });
		return { status: 409, body: errorBody('COURSE_NOT_ACTIVE', 'The course is not active.', details) };
	}
	if (code === 'DUPLICATE_ACTIVE_REQUEST') {
		details.push({ field: 'learnerEmail', message: 'This learner already has a pending or approved request for the course.' });
		return { status: 409, body: errorBody('DUPLICATE_ACTIVE_REQUEST', 'An active enrollment request already exists for this learner and course.', details) };
	}
	if (code === 'ENROLLMENT_REQUEST_NOT_FOUND') {
		details.push({ field: 'id', message: 'No enrollment request exists with this id.' });
		return { status: 404, body: errorBody('ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request was not found.', details) };
	}
	if (code === 'INVALID_STATUS_TRANSITION') {
		details.push({ field: 'status', message: 'That status transition is not allowed.' });
		return { status: 409, body: errorBody('INVALID_STATUS_TRANSITION', 'The status transition is not allowed.', details) };
	}
	if (code === 'INVALID_REQUEST') {
		details.push({ field: 'request', message: 'The request could not be completed.' });
		return invalidRequest(details);
	}
	return undefined;
};

interface CreatePayload {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
}

interface StatusPayload {
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
}

const asPayload = <T>(value: unknown): T | undefined => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return undefined;
	}
	return value as T;
};

const readJson = async (read: () => Promise<unknown>): Promise<unknown> => {
	try {
		return await read();
	} catch {
		return undefined;
	}
};

export const enrollmentRequestCreate = async (applicationServices: ApplicationServices, read: () => Promise<unknown>): Promise<EnrollmentResult> => {
	const payload = await readJson(read);
	const record = asPayload<CreatePayload>(payload);
	const details: { field: string; message: string }[] = [];
	if (!record) {
		details.push({ field: 'body', message: 'Request body must be a JSON object.' });
		return invalidRequest(details);
	}
	const courseIdValue = record.courseId;
	const learnerEmailValue = record.learnerEmail;
	const justificationValue = record.justification;
	const courseId = typeof courseIdValue === 'string' ? courseIdValue.trim() : undefined;
	const learnerEmail = typeof learnerEmailValue === 'string' ? learnerEmailValue.trim() : undefined;
	const justification = typeof justificationValue === 'string' ? justificationValue.trim() : undefined;
	if (courseId === undefined || courseId.length === 0) {
		details.push({ field: 'courseId', message: 'courseId is required.' });
	}
	if (learnerEmail === undefined || !emailPattern.test(learnerEmail) || learnerEmail.length > 320) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}
	if (justification === undefined || justification.length < 20 || justification.length > 500) {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
	}
	if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		return invalidRequest(details);
	}
	try {
		const created = await applicationServices.Enrollment.EnrollmentRequest.create({ courseId, learnerEmail, justification });
		return { status: 200, body: enrollmentBody(created) };
	} catch (error) {
		const mapped = domainError(error);
		if (mapped) {
			return mapped;
		}
		throw error;
	}
};

export const enrollmentRequestGet = async (applicationServices: ApplicationServices, id: string): Promise<EnrollmentResult> => {
	try {
		const found = await applicationServices.Enrollment.EnrollmentRequest.get({ id });
		return { status: 200, body: enrollmentBody(found) };
	} catch (error) {
		const mapped = domainError(error);
		if (mapped) {
			return mapped;
		}
		throw error;
	}
};

export const enrollmentRequestQuery = async (applicationServices: ApplicationServices, values: Record<string, string[]>): Promise<EnrollmentResult> => {
	const details: { field: string; message: string }[] = [];
	const read = (field: string): string | undefined => {
		const entries = values[field];
		if (!entries || entries.length === 0) {
			return undefined;
		}
		if (entries.length > 1) {
			details.push({ field, message: `${field} must be provided once.` });
			return undefined;
		}
		return entries[0]?.trim();
	};
	for (const field of Object.keys(values)) {
		if (!listParameters.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}
	const statusValue = read('status');
	const courseId = read('courseId');
	const learnerEmail = read('learnerEmail');
	if (statusValue !== undefined && !requestStatuses.has(statusValue)) {
		details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
	}
	if (courseId !== undefined && courseId.length === 0) {
		details.push({ field: 'courseId', message: 'courseId must not be empty.' });
	}
	if (learnerEmail !== undefined && learnerEmail.length === 0) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must not be empty.' });
	}
	if (details.length > 0) {
		return invalidRequest(details);
	}
	const status = statusValue === 'pending' || statusValue === 'approved' || statusValue === 'rejected' || statusValue === 'cancelled' ? statusValue : undefined;
	try {
		const items = await applicationServices.Enrollment.EnrollmentRequest.query({
			...(status === undefined ? {} : { status }),
			...(courseId === undefined || courseId.length === 0 ? {} : { courseId }),
			...(learnerEmail === undefined || learnerEmail.length === 0 ? {} : { learnerEmail }),
		});
		return { status: 200, body: { items: items.map((item) => enrollmentBody(item)) } };
	} catch (error) {
		const mapped = domainError(error);
		if (mapped) {
			return mapped;
		}
		throw error;
	}
};

export const enrollmentRequestUpdateStatus = async (applicationServices: ApplicationServices, id: string, read: () => Promise<unknown>): Promise<EnrollmentResult> => {
	const payload = await readJson(read);
	const record = asPayload<StatusPayload>(payload);
	const details: { field: string; message: string }[] = [];
	if (!record) {
		details.push({ field: 'body', message: 'Request body must be a JSON object.' });
		return invalidRequest(details);
	}
	const statusField = record.status;
	const changedByField = record.changedBy;
	const reasonField = record.reason;
	const statusValue = typeof statusField === 'string' ? statusField.trim() : undefined;
	const changedBy = typeof changedByField === 'string' ? changedByField.trim() : undefined;
	const reasonProvided = Object.hasOwn(record, 'reason');
	const reason = typeof reasonField === 'string' ? reasonField.trim() : undefined;
	if (statusValue === undefined || !requestStatuses.has(statusValue)) {
		details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
	}
	if (changedBy === undefined || changedBy.length === 0) {
		details.push({ field: 'changedBy', message: 'changedBy is required.' });
	}
	if (reasonProvided && reason === undefined) {
		details.push({ field: 'reason', message: 'reason must be a string.' });
	}
	if (statusValue === 'rejected' && (reason === undefined || reason.length === 0)) {
		details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
	}
	if (reasonProvided && reason !== undefined && reason.length === 0 && statusValue !== 'rejected') {
		details.push({ field: 'reason', message: 'reason must not be empty.' });
	}
	if (details.length > 0 || statusValue === undefined || changedBy === undefined || !requestStatuses.has(statusValue)) {
		return invalidRequest(details);
	}
	const resolvedStatus = statusValue === 'pending' || statusValue === 'approved' || statusValue === 'rejected' || statusValue === 'cancelled' ? statusValue : undefined;
	if (resolvedStatus === undefined) {
		return invalidRequest(details);
	}
	try {
		const updated = await applicationServices.Enrollment.EnrollmentRequest.updateStatus({
			id,
			status: resolvedStatus,
			changedBy,
			...(reason === undefined || reason.length === 0 ? {} : { reason }),
		});
		return { status: 200, body: enrollmentBody(updated) };
	} catch (error) {
		const mapped = domainError(error);
		if (mapped) {
			return mapped;
		}
		throw error;
	}
};
