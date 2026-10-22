import type { ApplicationServicesFactory, EnrollmentRequestError, EnrollmentRequestQueryCommand, EnrollmentRequestResult, EnrollmentRequestStatus, EnrollmentRequestStatusUpdateCommand } from '@axc/application-services';
import type { Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { errorResponse, type FieldError, oneOf, positiveInteger, readQuery, servicesFor } from './http.ts';

const statuses: readonly EnrollmentRequestStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

// Mirrors the domain's LearnerEmail and Justification rules so a 400 can list every invalid field at once;
// the domain value objects still enforce them for any other caller.
const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const JUSTIFICATION_MIN = 20;
const JUSTIFICATION_MAX = 500;
const REASON_MAX = 500;

const statusByCode: Record<EnrollmentRequestError['code'], ContentfulStatusCode> = {
	INVALID_REQUEST: 400,
	COURSE_NOT_FOUND: 404,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	INVALID_STATUS_TRANSITION: 409,
};

const invalid = (c: Context, details: FieldError[]): Response => errorResponse(c, 400, 'INVALID_REQUEST', 'The request could not be completed.', details);

const respond = (c: Context, result: EnrollmentRequestResult, successStatus: ContentfulStatusCode): Response =>
	result.ok ? c.json(result.value, successStatus) : errorResponse(c, statusByCode[result.error.code], result.error.code, result.error.message, result.error.details);

async function readJsonObject(c: Context): Promise<Record<string, unknown> | undefined> {
	const body: unknown = await c.req.json().catch(() => undefined);
	return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : undefined;
}

function requiredString(value: unknown, field: string, errors: FieldError[]): string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		errors.push({ field, message: `${field} is required and must be a non-empty string.` });
		return '';
	}
	return value;
}

function parseCreateBody(body: Record<string, unknown>): { ok: true; value: { courseId: string; learnerEmail: string; justification: string } } | { ok: false; errors: FieldError[] } {
	const errors: FieldError[] = [];
	const { courseId: rawCourseId, learnerEmail: rawLearnerEmail, justification } = body;
	const courseId = requiredString(rawCourseId, 'courseId', errors);
	const learnerEmail = requiredString(rawLearnerEmail, 'learnerEmail', errors);
	if (learnerEmail && (learnerEmail.trim().length > 254 || !emailPattern.test(learnerEmail.trim()))) {
		errors.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}
	const justificationLength = typeof justification === 'string' ? justification.trim().length : -1;
	if (typeof justification !== 'string' || justificationLength < JUSTIFICATION_MIN || justificationLength > JUSTIFICATION_MAX) {
		errors.push({ field: 'justification', message: `justification must be between ${JUSTIFICATION_MIN} and ${JUSTIFICATION_MAX} characters.` });
	}
	return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { courseId: courseId.trim(), learnerEmail, justification: justification as string } };
}

function parseStatusBody(id: string, body: Record<string, unknown>): { ok: true; value: EnrollmentRequestStatusUpdateCommand } | { ok: false; errors: FieldError[] } {
	const errors: FieldError[] = [];
	const { status: rawStatus, changedBy: rawChangedBy, reason } = body;
	const status = typeof rawStatus === 'string' ? oneOf(rawStatus, statuses, 'status', errors) : undefined;
	if (typeof rawStatus !== 'string') {
		errors.push({ field: 'status', message: `status is required and must be one of: ${statuses.join(', ')}.` });
	}
	const changedBy = requiredString(rawChangedBy, 'changedBy', errors);
	if (reason !== undefined && reason !== null && typeof reason !== 'string') {
		errors.push({ field: 'reason', message: 'reason must be a string.' });
	} else if (typeof reason === 'string' && reason.trim().length > REASON_MAX) {
		errors.push({ field: 'reason', message: `reason must be at most ${REASON_MAX} characters.` });
	} else if (status === 'rejected' && (typeof reason !== 'string' || reason.trim().length === 0)) {
		errors.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
	}
	if (errors.length > 0 || status === undefined) {
		return { ok: false, errors };
	}
	const value: EnrollmentRequestStatusUpdateCommand = { id, status, changedBy: changedBy.trim() };
	if (typeof reason === 'string' && reason.trim().length > 0) {
		value.reason = reason.trim();
	}
	return { ok: true, value };
}

function parseListQuery(query: Record<string, string[]>): { ok: true; value: EnrollmentRequestQueryCommand } | { ok: false; errors: FieldError[] } {
	const errors: FieldError[] = [];
	const { status, courseId, learnerEmail, page, pageSize } = readQuery(query, ['status', 'courseId', 'learnerEmail', 'page', 'pageSize'], errors);
	const value: EnrollmentRequestQueryCommand = {
		page: positiveInteger(page, 1, 'page', Number.MAX_SAFE_INTEGER, errors),
		pageSize: positiveInteger(pageSize, 10, 'pageSize', 50, errors),
	};
	const parsedStatus = oneOf(status, statuses, 'status', errors);
	if (parsedStatus) {
		value.status = parsedStatus;
	}
	if (courseId) {
		value.courseId = courseId;
	}
	if (learnerEmail) {
		value.learnerEmail = learnerEmail;
	}
	return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

export function registerEnrollmentRequestRoutes(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.post('/api/enrollment-requests', async (c) => {
		const body = await readJsonObject(c);
		if (!body) {
			return invalid(c, [{ field: 'body', message: 'Request body must be a JSON object.' }]);
		}
		const parsed = parseCreateBody(body);
		if (!parsed.ok) {
			return invalid(c, parsed.errors);
		}
		const services = await servicesFor(c, applicationServicesFactory);
		return respond(c, await services.Enrollment.EnrollmentRequest.create(parsed.value), 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const parsed = parseListQuery(c.req.queries());
		if (!parsed.ok) {
			return invalid(c, parsed.errors);
		}
		const services = await servicesFor(c, applicationServicesFactory);
		return c.json(await services.Enrollment.EnrollmentRequest.queryEnrollmentRequests(parsed.value));
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const services = await servicesFor(c, applicationServicesFactory);
		return respond(c, await services.Enrollment.EnrollmentRequest.getById({ id: c.req.param('id') }), 200);
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const body = await readJsonObject(c);
		if (!body) {
			return invalid(c, [{ field: 'body', message: 'Request body must be a JSON object.' }]);
		}
		const parsed = parseStatusBody(c.req.param('id'), body);
		if (!parsed.ok) {
			return invalid(c, parsed.errors);
		}
		const services = await servicesFor(c, applicationServicesFactory);
		return respond(c, await services.Enrollment.EnrollmentRequest.updateStatus(parsed.value), 200);
	});
}
