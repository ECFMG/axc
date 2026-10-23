import {
	type ApplicationServicesFactory,
	type ChangeEnrollmentStatusInput,
	type CreateEnrollmentInput,
	EnrollmentError,
	type EnrollmentErrorCode,
	type EnrollmentRequest,
	type EnrollmentStatus,
	enrollmentStatuses,
	isEnrollmentStatus,
	isValidJustification,
	isValidLearnerEmail,
	JUSTIFICATION_MAX,
	JUSTIFICATION_MIN,
	type StatusHistoryEntry,
} from '@axc/application-services';
import type { Context, Hono } from 'hono';

interface Detail {
	field: string;
	message: string;
}

const requestError = (code: EnrollmentErrorCode, details: Detail[]) => ({
	error: {
		code,
		message: 'The request could not be completed.',
		details,
	},
});

const STATUS = {
	COURSE_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	INVALID_STATUS_TRANSITION: 409,
	INVALID_REQUEST: 400,
} as const satisfies Record<EnrollmentErrorCode, number>;

const fail = (c: Context, error: unknown): Response => {
	if (error instanceof EnrollmentError) return c.json(requestError(error.code, [{ field: error.field, message: error.message }]), STATUS[error.code]);
	throw error;
};

const readField = (body: Record<string, unknown>, key: string): unknown => body[key];

const readObject = async (c: Context): Promise<Record<string, unknown> | undefined> => {
	try {
		const body: unknown = await c.req.json();
		return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : undefined;
	} catch {
		return undefined;
	}
};

export function registerEnrollmentRequestCommands(app: Hono, factory: ApplicationServicesFactory): void {
	const servicesFor = (authorization: string | undefined) => (authorization === undefined ? factory.forRequest() : factory.forRequest(authorization));

	app.post('/api/enrollment-requests', async (c) => {
		const body = await readObject(c);
		if (body === undefined) return c.json(requestError('INVALID_REQUEST', [{ field: 'body', message: 'body must be a JSON object.' }]), 400);
		const courseIdRaw = readField(body, 'courseId');
		const learnerEmailRaw = readField(body, 'learnerEmail');
		const justificationRaw = readField(body, 'justification');
		const details: Detail[] = [];
		const courseId = typeof courseIdRaw === 'string' ? courseIdRaw.trim() : '';
		if (courseId === '') details.push({ field: 'courseId', message: 'courseId is required.' });
		if (!isValidLearnerEmail(learnerEmailRaw)) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		if (!isValidJustification(justificationRaw)) details.push({ field: 'justification', message: `justification must be between ${JUSTIFICATION_MIN} and ${JUSTIFICATION_MAX} characters.` });
		if (details.length > 0) return c.json(requestError('INVALID_REQUEST', details), 400);
		if (typeof learnerEmailRaw !== 'string' || typeof justificationRaw !== 'string') return c.json(requestError('INVALID_REQUEST', details), 400);
		const input: CreateEnrollmentInput = { courseId, learnerEmail: learnerEmailRaw, justification: justificationRaw };
		const services = await servicesFor(c.req.header('Authorization'));
		try {
			const created: EnrollmentRequest = services.enrollmentRequests.create(input);
			const statusHistory: StatusHistoryEntry[] = created.statusHistory;
			return c.json({ ...created, statusHistory }, 201);
		} catch (error) {
			return fail(c, error);
		}
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const body = await readObject(c);
		if (body === undefined) return c.json(requestError('INVALID_REQUEST', [{ field: 'body', message: 'body must be a JSON object.' }]), 400);
		const statusRaw = readField(body, 'status');
		const changedByRaw = readField(body, 'changedBy');
		const reasonRaw = readField(body, 'reason');
		const details: Detail[] = [];
		if (!isEnrollmentStatus(statusRaw)) details.push({ field: 'status', message: `status must be one of ${enrollmentStatuses.join(', ')}.` });
		if (typeof changedByRaw !== 'string' || changedByRaw.trim() === '') details.push({ field: 'changedBy', message: 'changedBy is required.' });
		if (statusRaw === 'rejected' && (typeof reasonRaw !== 'string' || reasonRaw.trim() === '')) details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
		if (details.length > 0) return c.json(requestError('INVALID_REQUEST', details), 400);
		if (!isEnrollmentStatus(statusRaw) || typeof changedByRaw !== 'string') return c.json(requestError('INVALID_REQUEST', details), 400);
		const status: EnrollmentStatus = statusRaw;
		const input: ChangeEnrollmentStatusInput = { status, changedBy: changedByRaw.trim() };
		if (typeof reasonRaw === 'string' && reasonRaw.trim() !== '') input.reason = reasonRaw.trim();
		const services = await servicesFor(c.req.header('Authorization'));
		try {
			const updated: EnrollmentRequest = services.enrollmentRequests.changeStatus(c.req.param('id'), input);
			return c.json(updated);
		} catch (error) {
			return fail(c, error);
		}
	});
}
