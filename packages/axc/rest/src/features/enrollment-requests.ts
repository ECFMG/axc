import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Context, Hono } from 'hono';
import { choice, queryFields, text } from './validation.ts';

const { WorkflowError, enrollmentStatuses, validEmail } = Domain.Contexts.Catalog;
async function body(c: Context): Promise<Record<string, unknown>> {
	let result: unknown;
	try {
		result = await c.req.json();
	} catch {
		throw new WorkflowError('INVALID_REQUEST', 'The request could not be completed.', [{ field: 'body', message: 'A JSON object is required.' }]);
	}
	if (!result || typeof result !== 'object' || Array.isArray(result)) throw new WorkflowError('INVALID_REQUEST', 'The request could not be completed.', [{ field: 'body', message: 'A JSON object is required.' }]);
	return result as Record<string, unknown>;
}
function reject(details: Domain.Contexts.Catalog.Problem[]): void {
	if (details.length) throw new WorkflowError('INVALID_REQUEST', 'The request could not be completed.', details);
}
export function registerEnrollments(app: Hono, factory: ApplicationServicesFactory): void {
	const run = async (c: Context, work: () => Promise<Response>): Promise<Response> => {
		try {
			return await work();
		} catch (error) {
			if (error instanceof WorkflowError) {
				const status = error.code === 'INVALID_REQUEST' ? 400 : error.code.endsWith('NOT_FOUND') ? 404 : 409;
				return c.json({ error: { code: error.code, message: error.message, details: error.details } }, status);
			}
			if (error instanceof Error && error.name === 'NotFoundError') return c.json({ error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND', message: error.message, details: [] } }, 404);
			throw error;
		}
	};
	const api = async (c: Context) => (await factory.forRequest(c.req.header('Authorization'))).Catalog.EnrollmentRequest;
	app.post('/api/enrollment-requests', (c) =>
		run(c, async () => {
			const raw = await body(c);
			const details: Domain.Contexts.Catalog.Problem[] = [];
			const courseId = text(raw['courseId'], 'courseId', details, true) ?? '';
			const learnerEmail = text(raw['learnerEmail'], 'learnerEmail', details, true) ?? '';
			const justification = text(raw['justification'], 'justification', details, true) ?? '';
			// Collect domain field errors together with HTTP type errors.
			try {
				Domain.Contexts.Catalog.validateCreate({ courseId, learnerEmail, justification });
			} catch (e) {
				if (e instanceof WorkflowError) details.push(...e.details);
				else throw e;
			}
			reject(details);
			return c.json(await (await api(c)).create({ courseId, learnerEmail, justification }), 201);
		}),
	);
	app.get('/api/enrollment-requests', (c) =>
		run(c, async () => {
			const details: Domain.Contexts.Catalog.Problem[] = [];
			queryFields(c.req.url, ['status', 'courseId', 'learnerEmail'], details);
			const status = choice(c.req.query('status'), 'status', enrollmentStatuses, details);
			const courseId = text(c.req.query('courseId'), 'courseId', details);
			const learnerEmail = text(c.req.query('learnerEmail'), 'learnerEmail', details);
			if (learnerEmail && !validEmail(learnerEmail)) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
			reject(details);
			return c.json({ items: await (await api(c)).list({ ...(status === undefined ? {} : { status }), ...(courseId === undefined ? {} : { courseId }), ...(learnerEmail === undefined ? {} : { learnerEmail }) }) });
		}),
	);
	app.get('/api/enrollment-requests/:id', (c) => run(c, async () => c.json(await (await api(c)).getById(c.req.param('id')))));
	app.patch('/api/enrollment-requests/:id/status', (c) =>
		run(c, async () => {
			const raw = await body(c);
			const details: Domain.Contexts.Catalog.Problem[] = [];
			const status = choice(raw['status'], 'status', enrollmentStatuses, details);
			if (raw['status'] === undefined) details.push({ field: 'status', message: 'status is required.' });
			const changedBy = text(raw['changedBy'], 'changedBy', details, true) ?? '';
			const reason = text(raw['reason'], 'reason', details);
			if (status === 'rejected' && !reason) details.push({ field: 'reason', message: 'Rejection requires a reason.' });
			reject(details);
			if (!status) throw new Error('Validated status is missing.');
			return c.json(await (await api(c)).changeStatus(c.req.param('id'), { status, changedBy, ...(reason === undefined ? {} : { reason }) }));
		}),
	);
}
