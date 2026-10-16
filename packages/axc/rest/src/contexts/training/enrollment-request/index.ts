import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Hono } from 'hono';
import { optionalText, parseEnum, readJsonObject, requireValid } from '../../../validation.ts';

const enrollment = Domain.Contexts.Training.EnrollmentRequest;
export const registerEnrollmentRequestRoutes = (app: Hono, factory: ApplicationServicesFactory): void => {
	app.post('/api/enrollment-requests', async (c) => {
		const body = await readJsonObject(() => c.req.json());
		const details = enrollment.validateEnrollmentInput(body.learnerEmail, body.justification);
		if (typeof body.courseId !== 'string' || body.courseId.trim() === '') {
			details.push({ field: 'courseId', message: 'courseId must identify a course.' });
		}
		requireValid(details, false);
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(await services.Training.EnrollmentRequest.create({ courseId: body.courseId as string, learnerEmail: body.learnerEmail as string, justification: body.justification as string }), 201);
	});
	app.get('/api/enrollment-requests/:id', async (c) => {
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(await services.Training.EnrollmentRequest.queryById({ id: c.req.param('id') }));
	});
	app.get('/api/enrollment-requests', async (c) => {
		const details: Domain.Contexts.Training.EnrollmentRequest.ValidationDetail[] = [];
		const status = parseEnum(c.req.query('status'), enrollment.ENROLLMENT_REQUEST_STATUSES, 'status', details);
		const learnerEmail = optionalText(c.req.query('learnerEmail'));
		const courseId = optionalText(c.req.query('courseId'));
		if (learnerEmail !== undefined && !enrollment.isLearnerEmail(learnerEmail)) {
			details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		}
		requireValid(details, true);
		const criteria: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestFilter = {};
		if (status !== undefined) {
			criteria.status = status;
		}
		if (learnerEmail !== undefined) {
			criteria.learnerEmail = learnerEmail;
		}
		if (courseId !== undefined) {
			criteria.courseId = courseId;
		}
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(await services.Training.EnrollmentRequest.queryRequests(criteria));
	});
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const body = await readJsonObject(() => c.req.json());
		requireValid(enrollment.validateStatusChange(body.status, body.changedBy, body.reason), false);
		const command: Domain.Contexts.Training.EnrollmentRequest.ChangeEnrollmentRequestStatus = {
			id: c.req.param('id'),
			status: body.status as Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestStatus,
			changedBy: body.changedBy as string,
		};
		const reason = body.reason;
		if (typeof reason === 'string' && reason.trim() !== '') {
			command.reason = reason;
		}
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(await services.Training.EnrollmentRequest.updateStatus(command));
	});
};
