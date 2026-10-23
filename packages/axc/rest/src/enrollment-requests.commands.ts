import { type ApplicationServicesFactory, EnrollmentRequestError, type EnrollmentRequestErrorCode, enrollmentRequestStatuses, isEnrollmentRequestStatus, isValidEmail, isValidJustification } from '@axc/application-services';
import type { Context, Hono } from 'hono';

interface Detail {
	field: string;
	message: string;
}

const COMPLETE = 'The request could not be completed.';
const errorBody = (code: string, message: string, details: Detail[]) => ({ error: { code, message, details } });
const STATUS = { INVALID_REQUEST: 400, COURSE_NOT_FOUND: 404, COURSE_NOT_ACTIVE: 409, DUPLICATE_ACTIVE_REQUEST: 409, ENROLLMENT_REQUEST_NOT_FOUND: 404, INVALID_STATUS_TRANSITION: 409 } as const satisfies Record<
	EnrollmentRequestErrorCode,
	number
>;

const fail = (c: Context, e: unknown): Response => {
	if (e instanceof EnrollmentRequestError) {
		return c.json(errorBody(e.code, e.message, e.details), STATUS[e.code]);
	}
	throw e;
};

const readObject = async (c: Context): Promise<Record<string, unknown> | undefined> => {
	try {
		const body: unknown = await c.req.json();
		return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : undefined;
	} catch {
		return undefined;
	}
};

export function registerEnrollmentRequestsCommands(app: Hono, factory: ApplicationServicesFactory): void {
	app.post('/api/enrollment-requests', async (c) => {
		const body = await readObject(c);
		if (body === undefined) {
			return c.json(errorBody('INVALID_REQUEST', COMPLETE, [{ field: 'body', message: 'must be a JSON object' }]), 400);
		}
		const details: Detail[] = [];
		const { courseId, learnerEmail, justification } = body;
		if (typeof courseId !== 'string' || courseId.length === 0) {
			details.push({ field: 'courseId', message: 'courseId is required.' });
		}
		if (typeof learnerEmail !== 'string' || !isValidEmail(learnerEmail)) {
			details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		}
		if (typeof justification !== 'string' || !isValidJustification(justification)) {
			details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		}
		if (details.length > 0 || typeof courseId !== 'string' || typeof learnerEmail !== 'string' || typeof justification !== 'string') {
			return c.json(errorBody('INVALID_REQUEST', COMPLETE, details), 400);
		}
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		try {
			return c.json(services.enrollmentRequests.create({ courseId, learnerEmail, justification }), 201);
		} catch (error) {
			return fail(c, error);
		}
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const id = c.req.param('id');
		if (id === undefined || id.length === 0) {
			return c.json(errorBody('INVALID_REQUEST', COMPLETE, [{ field: 'id', message: 'id is required.' }]), 400);
		}
		const body = await readObject(c);
		if (body === undefined) {
			return c.json(errorBody('INVALID_REQUEST', COMPLETE, [{ field: 'body', message: 'must be a JSON object' }]), 400);
		}
		const details: Detail[] = [];
		const { status, changedBy, reason } = body;
		if (!isEnrollmentRequestStatus(status)) {
			details.push({ field: 'status', message: `status must be one of ${enrollmentRequestStatuses.join(', ')}.` });
		}
		if (typeof changedBy !== 'string' || changedBy.length === 0) {
			details.push({ field: 'changedBy', message: 'changedBy is required.' });
		}
		if (reason !== undefined && typeof reason !== 'string') {
			details.push({ field: 'reason', message: 'reason must be a string.' });
		}
		if (isEnrollmentRequestStatus(status) && status === 'rejected' && (typeof reason !== 'string' || reason.trim().length === 0)) {
			details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
		}
		if (details.length > 0 || !isEnrollmentRequestStatus(status) || typeof changedBy !== 'string') {
			return c.json(errorBody('INVALID_REQUEST', COMPLETE, details), 400);
		}
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		try {
			const input = typeof reason === 'string' ? { status, changedBy, reason } : { status, changedBy };
			return c.json(services.enrollmentRequests.updateStatus(id, input));
		} catch (error) {
			return fail(c, error);
		}
	});
}
