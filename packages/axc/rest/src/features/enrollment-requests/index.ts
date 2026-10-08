import type { ApplicationServicesFactory } from '@axc/application-services';
import { Catalog } from '@axc/domain';
import type { EnrollmentRequestFilters } from '@axc/persistence';
import type { Hono } from 'hono';

const statuses = ['pending', 'approved', 'rejected', 'cancelled'];
type Detail = { field: string; message: string };
const invalid = (details: Detail[]) => ({ error: { code: 'INVALID_REQUEST', message: 'The request could not be completed.', details } });
const errorStatus = (code: string): 404 | 409 | 400 => (code.endsWith('_NOT_FOUND') ? 404 : code === 'INVALID_REQUEST' ? 400 : 409);
const mapError = (error: unknown) => {
	if (!(error instanceof Catalog.EnrollmentRequest.EnrollmentError)) throw error;
	return { error: { code: error.code, message: error.message, details: [] } };
};
const bodyObject = async (request: Request): Promise<Record<string, unknown> | null> => {
	try {
		const value: unknown = await request.json();
		return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
	} catch {
		return null;
	}
};

export function registerEnrollmentRequestRoutes(app: Hono, services: ApplicationServicesFactory): void {
	app.post('/api/enrollment-requests', async (c) => {
		const body = await bodyObject(c.req.raw);
		const details: Detail[] = [];
		if (typeof body?.['courseId'] !== 'string' || !body['courseId'].trim()) details.push({ field: 'courseId', message: 'courseId is required.' });
		if (typeof body?.['learnerEmail'] !== 'string' || !/^[^\s@.]+(?:\.[^\s@.]+)*@[^\s@.]+(?:\.[^\s@.]+)+$/.test(body['learnerEmail'].trim()))
			details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		if (typeof body?.['justification'] !== 'string' || body['justification'].trim().length < 20 || body['justification'].trim().length > 500)
			details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		if (details.length) return c.json(invalid(details), 400);
		try {
			const application = await services.forRequest();
			const created = await application.Catalog.EnrollmentRequest.create({ courseId: body?.['courseId'] as string, learnerEmail: body?.['learnerEmail'] as string, justification: body?.['justification'] as string });
			return c.json(created, 201);
		} catch (error) {
			const mapped = mapError(error);
			return c.json(mapped, errorStatus(mapped.error.code));
		}
	});
	app.get('/api/enrollment-requests', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const details: Detail[] = [];
		for (const key of params.keys()) if (!['status', 'courseId', 'learnerEmail'].includes(key) || params.getAll(key).length > 1) details.push({ field: key, message: `${key} is invalid.` });
		const status = params.get('status');
		if (status !== null && !statuses.includes(status)) details.push({ field: 'status', message: 'status is invalid.' });
		if (details.length) return c.json(invalid(details), 400);
		const filters: EnrollmentRequestFilters = {};
		if (status) filters.status = status as NonNullable<EnrollmentRequestFilters['status']>;
		if (params.has('courseId')) filters.courseId = params.get('courseId') ?? '';
		if (params.has('learnerEmail')) filters.learnerEmail = params.get('learnerEmail') ?? '';
		const application = await services.forRequest();
		return c.json(await application.Catalog.EnrollmentRequest.list(filters));
	});
	app.get('/api/enrollment-requests/:id', async (c) => {
		const application = await services.forRequest();
		const request = await application.Catalog.EnrollmentRequest.getById(c.req.param('id'));
		return request ? c.json(request) : c.json({ error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND', message: 'Enrollment request not found.', details: [] } }, 404);
	});
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const body = await bodyObject(c.req.raw);
		const details: Detail[] = [];
		if (typeof body?.['status'] !== 'string' || !statuses.includes(body['status'])) details.push({ field: 'status', message: 'status is invalid.' });
		if (typeof body?.['changedBy'] !== 'string' || !body['changedBy'].trim()) details.push({ field: 'changedBy', message: 'changedBy is required.' });
		if (body?.['status'] === 'rejected' && (typeof body['reason'] !== 'string' || !body['reason'].trim())) details.push({ field: 'reason', message: 'reason is required for rejection.' });
		if (body?.['reason'] !== undefined && typeof body['reason'] !== 'string') details.push({ field: 'reason', message: 'reason must be a string.' });
		if (details.length) return c.json(invalid(details), 400);
		try {
			const application = await services.forRequest();
			return c.json(
				await application.Catalog.EnrollmentRequest.updateStatus({
					id: c.req.param('id'),
					status: body?.['status'] as Catalog.EnrollmentRequest.EnrollmentStatus,
					changedBy: (body?.['changedBy'] as string).trim(),
					...(body?.['reason'] !== undefined ? { reason: body['reason'] as string } : {}),
				}),
			);
		} catch (error) {
			const mapped = mapError(error);
			return c.json(mapped, errorStatus(mapped.error.code));
		}
	});
}
