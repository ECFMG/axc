import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Context, Hono } from 'hono';
import { body, type Detail, invalid, queryFields, stringField } from './validation.ts';

const { WorkflowError, requestStatuses, validateCreation, validateChange, validEmail } = Domain.Contexts.Catalog.EnrollmentRequest;
function failure(c: Context, error: unknown): Response {
	if (!(error instanceof WorkflowError)) throw error;
	const status = error.code === 'INVALID_REQUEST' ? 400 : ['COURSE_NOT_FOUND', 'ENROLLMENT_REQUEST_NOT_FOUND'].includes(error.code) ? 404 : 409;
	return c.json({ error: { code: error.code, message: error.message, details: error.details } }, status);
}
export function registerEnrollmentRequests(app: Hono, factory: ApplicationServicesFactory): void {
	const service = async (c: Context) => (await factory.forRequest(c.req.header('Authorization'))).Catalog.EnrollmentRequest;
	app.post('/api/enrollment-requests', async (c) => {
		const raw = await body(c);
		if (!raw) return invalid(c, [{ field: 'body', message: 'A JSON object is required.' }]);
		const input = { courseId: stringField(raw.courseId), learnerEmail: stringField(raw.learnerEmail), justification: stringField(raw.justification) };
		const details = validateCreation(input);
		if (details.length) return invalid(c, details);
		try {
			const created = await (await service(c)).create(input);
			c.header('Location', `/api/enrollment-requests/${created.id}`);
			return c.json(created, 201);
		} catch (error) {
			return failure(c, error);
		}
	});
	app.get('/api/enrollment-requests', async (c) => {
		const details: Detail[] = [];
		const fields = queryFields(c, ['status', 'courseId', 'learnerEmail'], details);
		if (fields.status !== undefined && !requestStatuses.includes(fields.status as Domain.Contexts.Catalog.EnrollmentRequest.RequestStatus)) details.push({ field: 'status', message: 'Invalid status.' });
		if (fields.learnerEmail !== undefined && !validEmail(fields.learnerEmail)) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		if (details.length) return invalid(c, details);
		const filters: Domain.Contexts.Catalog.EnrollmentRequest.RequestFilters = {};
		if (fields.status !== undefined) filters.status = fields.status as Domain.Contexts.Catalog.EnrollmentRequest.RequestStatus;
		if (fields.courseId !== undefined) filters.courseId = fields.courseId;
		if (fields.learnerEmail !== undefined) filters.learnerEmail = fields.learnerEmail;
		return c.json({ items: await (await service(c)).list(filters) });
	});
	app.get('/api/enrollment-requests/:id', async (c) => {
		try {
			return c.json(await (await service(c)).getById(c.req.param('id')));
		} catch (error) {
			return failure(c, error);
		}
	});
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const raw = await body(c);
		if (!raw) return invalid(c, [{ field: 'body', message: 'A JSON object is required.' }]);
		const input = {
			status: stringField(raw.status) as Domain.Contexts.Catalog.EnrollmentRequest.RequestStatus,
			changedBy: stringField(raw.changedBy),
			...(raw.reason !== undefined ? { reason: raw.reason as string } : {}),
		};
		const details = validateChange(input);
		if (details.length) return invalid(c, details);
		try {
			return c.json(await (await service(c)).changeStatus(c.req.param('id'), input));
		} catch (error) {
			return failure(c, error);
		}
	});
}
