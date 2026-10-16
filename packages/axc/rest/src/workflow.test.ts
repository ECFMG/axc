import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { buildTrainingApplicationServicesFactory } from '@axc/application-services';
import type { Domain } from '@axc/domain';
import { Persistence } from '@axc/persistence';
import { ServiceMongoose } from '@axc/service-mongoose';
import type { Hono } from 'hono';
import { afterAll, beforeAll, expect } from 'vitest';
import { createRestApp } from './index.ts';

type CoursePage = Domain.Contexts.Training.Course.CoursePage;
type EnrollmentRequestRecord = Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord;
interface ScenarioState {
	email: string;
	request?: EnrollmentRequestRecord;
}
interface HttpCase {
	title: string;
	path: string | ((state: ScenarioState) => string);
	method?: string;
	setup?: (state: ScenarioState) => Promise<void>;
	body?: (state: ScenarioState) => unknown;
	rawBody?: string;
	expectedStatus: number;
	expected?: unknown;
	check?: (body: unknown, state: ScenarioState) => void;
}
let app: Hono;
const mongo = new ServiceMongoose(undefined, async (service) => {
	app = createRestApp(buildTrainingApplicationServicesFactory({ environment: 'test' }, await Persistence(service, true)));
});
beforeAll(async () => {
	await mongo.startUp();
}, 120_000);
afterAll(async () => {
	await mongo.shutDown();
});
const validBody = (state: ScenarioState) => ({ courseId: 'course-001', learnerEmail: state.email, justification: 'I need this course for upcoming work.' });
async function createRequest(state: ScenarioState): Promise<EnrollmentRequestRecord> {
	const response = await app.request('/api/enrollment-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validBody(state)) });
	expect(response.status).toBe(201);
	return (await response.json()) as EnrollmentRequestRecord;
}
async function changeRequest(id: string, input: unknown): Promise<void> {
	const response = await app.request(`/api/enrollment-requests/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
	expect(response.status).toBe(200);
}
const cases: HttpCase[] = [
	{
		title: 'Course defaults',
		path: '/api/courses',
		expectedStatus: 200,
		expected: { page: 1, pageSize: 10, totalItems: 12, totalPages: 2 },
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items).toHaveLength(10);
			for (const course of page.items) {
				expect(course).toEqual({
					id: expect.any(String),
					title: expect.any(String),
					summary: expect.any(String),
					modality: expect.any(String),
					status: expect.any(String),
					tags: expect.any(Array),
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				});
			}
		},
	},
	{
		title: 'Course modality online',
		path: '/api/courses?modality=online',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.length).toBeGreaterThan(0);
			expect(page.items.every((course) => course.modality === 'online')).toBe(true);
		},
	},
	{
		title: 'Course modality in-person',
		path: '/api/courses?modality=in-person',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.length).toBeGreaterThan(0);
			expect(page.items.every((course) => course.modality === 'in-person')).toBe(true);
		},
	},
	{
		title: 'Course modality hybrid',
		path: '/api/courses?modality=hybrid',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.length).toBeGreaterThan(0);
			expect(page.items.every((course) => course.modality === 'hybrid')).toBe(true);
		},
	},
	{
		title: 'Course status active',
		path: '/api/courses?status=active',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.length).toBeGreaterThan(0);
			expect(page.items.every((course) => course.status === 'active')).toBe(true);
		},
	},
	{
		title: 'Course status draft',
		path: '/api/courses?status=draft',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.length).toBeGreaterThan(0);
			expect(page.items.every((course) => course.status === 'draft')).toBe(true);
		},
	},
	{
		title: 'Course status retired',
		path: '/api/courses?status=retired',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.length).toBeGreaterThan(0);
			expect(page.items.every((course) => course.status === 'retired')).toBe(true);
		},
	},
	{
		title: 'Keyword across title summary and tags',
		path: '/api/courses?q=SeCuRiTy',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-002', 'course-007', 'course-011'].sort());
			expect(page.totalItems).toBe(4);
		},
	},
	{
		title: 'Case insensitive exact tag',
		path: '/api/courses?tag=AI',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-003'].sort());
			expect(page.totalItems).toBe(2);
		},
	},
	{
		title: 'Combined keyword modality status',
		path: '/api/courses?q=security&modality=online&status=active',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-007'].sort());
			expect(page.totalItems).toBe(2);
		},
	},
	{
		title: 'Combined tag status and modality',
		path: '/api/courses?tag=ai&status=active&modality=hybrid',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.map((course) => course.id).sort()).toEqual(['course-003'].sort());
			expect(page.totalItems).toBe(1);
		},
	},
	{
		title: 'Literal keyword regex characters',
		path: '/api/courses?q=%2E%2A',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.map((course) => course.id).sort()).toEqual([].sort());
			expect(page.totalItems).toBe(0);
		},
	},
	{
		title: 'Literal tag regex characters',
		path: '/api/courses?tag=%2E%2A',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.map((course) => course.id).sort()).toEqual([].sort());
			expect(page.totalItems).toBe(0);
		},
	},
	{
		title: 'No matching courses',
		path: '/api/courses?q=unknown-value',
		expectedStatus: 200,
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items.map((course) => course.id).sort()).toEqual([].sort());
			expect(page.totalItems).toBe(0);
		},
	},
	{
		title: 'Course pagination',
		path: '/api/courses?page=2&pageSize=5',
		expectedStatus: 200,
		expected: { page: 2, pageSize: 5, totalItems: 12, totalPages: 3 },
		check: (body) => {
			const page = body as CoursePage;
			expect(page.items).toHaveLength(5);
			expect(page.items.map((course) => course.title)).toEqual(['Draft TypeScript', 'Responsible AI', 'Retired JavaScript', 'Security Operations', 'Team Leadership']);
		},
	},
	{ title: 'Course page beyond results', path: '/api/courses?page=30', expectedStatus: 200, expected: { items: [], page: 30, totalItems: 12 } },
	{ title: 'Whitespace optional course fields', path: '/api/courses?q=%20&modality=%20&status=%20&tag=%20&page=%20&pageSize=%20&sort=%20', expectedStatus: 200, expected: { page: 1, pageSize: 10, totalItems: 12 } },
	{ title: 'Maximum course page size', path: '/api/courses?pageSize=50', expectedStatus: 200, expected: { pageSize: 50, totalItems: 12, totalPages: 1 } },
	{
		title: 'Sort courses by title',
		path: '/api/courses?sort=title&pageSize=50',
		expectedStatus: 200,
		check: (body) => {
			const items = (body as CoursePage).items.map((course) => course.title);
			expect(items).toEqual([...items].sort());
		},
	},
	{
		title: 'Sort courses by createdAt',
		path: '/api/courses?sort=createdAt&pageSize=50',
		expectedStatus: 200,
		check: (body) => {
			const items = (body as CoursePage).items.map((course) => course.createdAt);
			expect(items).toEqual([...items].sort());
		},
	},
	{
		title: 'Sort courses by updatedAt',
		path: '/api/courses?sort=updatedAt&pageSize=50',
		expectedStatus: 200,
		check: (body) => {
			const items = (body as CoursePage).items.map((course) => course.updatedAt);
			expect(items).toEqual([...items].sort());
		},
	},
	{
		title: 'Invalid course query modality=virtual',
		path: '/api/courses?modality=virtual',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'modality', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query status=invalid',
		path: '/api/courses?status=invalid',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'status', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query sort=id',
		path: '/api/courses?sort=id',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'sort', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query page=0',
		path: '/api/courses?page=0',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'page', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query page=-1',
		path: '/api/courses?page=-1',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'page', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query page=1.5',
		path: '/api/courses?page=1.5',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'page', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query page=1x',
		path: '/api/courses?page=1x',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'page', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query page=1e2',
		path: '/api/courses?page=1e2',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'page', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query page=Infinity',
		path: '/api/courses?page=Infinity',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'page', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query page=9007199254740999',
		path: '/api/courses?page=9007199254740999',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'page', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query page=9007199254740991&pageSize=50',
		path: '/api/courses?page=9007199254740991&pageSize=50',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'page', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query pageSize=0',
		path: '/api/courses?pageSize=0',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'pageSize', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query pageSize=51',
		path: '/api/courses?pageSize=51',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'pageSize', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query pageSize=1.2',
		path: '/api/courses?pageSize=1.2',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'pageSize', message: expect.any(String) })] } },
	},
	{
		title: 'Invalid course query pageSize=abc',
		path: '/api/courses?pageSize=abc',
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: 'pageSize', message: expect.any(String) })] } },
	},
	{
		title: 'Creates pending enrollment',
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => validBody(state),
		expectedStatus: 201,
		check: (body) => {
			const request = body as EnrollmentRequestRecord;
			expect(request.id).toMatch(/^enroll-/);
			expect(request.status).toBe('pending');
			expect(request.createdAt).toBe(request.updatedAt);
			expect(new Date(request.createdAt).toISOString()).toBe(request.createdAt);
			expect(request.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: request.createdAt, changedBy: 'system', reason: null }]);
		},
	},
	{ title: 'Missing enrollment course', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), courseId: 'missing' }), expectedStatus: 404, expected: { error: { code: 'COURSE_NOT_FOUND' } } },
	{ title: 'Draft enrollment course', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), courseId: 'course-004' }), expectedStatus: 409, expected: { error: { code: 'COURSE_NOT_ACTIVE' } } },
	{
		title: 'Retired enrollment course',
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => ({ ...validBody(state), courseId: 'course-005' }),
		expectedStatus: 409,
		expected: { error: { code: 'COURSE_NOT_ACTIVE' } },
	},
	{ title: 'Invalid learner email', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), learnerEmail: 'invalid' }), expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{ title: 'Object learner email', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), learnerEmail: { $ne: null } }), expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{ title: 'Object course id', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), courseId: { $ne: null } }), expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{
		title: 'Missing course id',
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => ({ learnerEmail: state.email, justification: validBody(state).justification }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{ title: 'Empty learner email', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), learnerEmail: '  ' }), expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{
		title: 'Short justification',
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => ({ ...validBody(state), justification: 'x'.repeat(19) }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{ title: 'Minimum justification', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), justification: 'x'.repeat(20) }), expectedStatus: 201 },
	{ title: 'Maximum justification', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), justification: 'x'.repeat(500) }), expectedStatus: 201 },
	{
		title: 'Long justification',
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => ({ ...validBody(state), justification: 'x'.repeat(501) }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{ title: 'Nonstring justification', path: '/api/enrollment-requests', method: 'POST', body: (state) => ({ ...validBody(state), justification: 100 }), expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{ title: 'Malformed JSON', path: '/api/enrollment-requests', method: 'POST', rawBody: '{broken', expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{ title: 'Array body', path: '/api/enrollment-requests', method: 'POST', rawBody: '[]', expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{ title: 'Null body', path: '/api/enrollment-requests', method: 'POST', rawBody: 'null', expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{ title: 'String body', path: '/api/enrollment-requests', method: 'POST', rawBody: '"hello"', expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{
		title: 'Duplicate pending',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => ({ ...validBody(state), learnerEmail: state.email.toUpperCase() }),
		expectedStatus: 409,
		expected: { error: { code: 'DUPLICATE_ACTIVE_REQUEST' } },
	},
	{
		title: 'Duplicate approved',
		setup: async (state) => {
			state.request = await createRequest(state);
			await changeRequest(state.request.id, { status: 'approved', changedBy: 'reviewer' });
		},
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => ({ ...validBody(state), learnerEmail: state.email.toUpperCase() }),
		expectedStatus: 409,
		expected: { error: { code: 'DUPLICATE_ACTIVE_REQUEST' } },
	},
	{
		title: 'Reapply after rejected',
		setup: async (state) => {
			state.request = await createRequest(state);
			await changeRequest(state.request.id, { status: 'rejected', changedBy: 'reviewer', reason: 'Prerequisite missing' });
		},
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => validBody(state),
		expectedStatus: 201,
		expected: { status: 'pending' },
	},
	{
		title: 'Reapply after cancelled',
		setup: async (state) => {
			state.request = await createRequest(state);
			await changeRequest(state.request.id, { status: 'cancelled', changedBy: 'reviewer', reason: 'Prerequisite missing' });
		},
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => validBody(state),
		expectedStatus: 201,
		expected: { status: 'pending' },
	},
	{
		title: 'Learner can request another course',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: '/api/enrollment-requests',
		method: 'POST',
		body: (state) => ({ ...validBody(state), courseId: 'course-002' }),
		expectedStatus: 201,
		expected: { courseId: 'course-002' },
	},
	{
		title: 'Retrieves enrollment history',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}`,
		expectedStatus: 200,
		check: (body) => {
			const request = body as EnrollmentRequestRecord;
			expect(request.statusHistory).toHaveLength(1);
			expect(request.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: 'pending' });
		},
	},
	{ title: 'Missing enrollment retrieval', path: '/api/enrollment-requests/not-a-request', expectedStatus: 404, expected: { error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND' } } },
	{
		title: 'HTTP transition pending to approved',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'approved', changedBy: 'reviewer', reason: 'Prerequisite missing' }),
		expectedStatus: 200,
		check: (body) => {
			const request = body as EnrollmentRequestRecord;
			expect(request.status).toBe('approved');
			expect(request.statusHistory).toHaveLength(2);
			expect(request.statusHistory.at(-1)).toEqual({ fromStatus: 'pending', toStatus: 'approved', changedAt: request.updatedAt, changedBy: 'reviewer', reason: 'Prerequisite missing' });
		},
	},
	{
		title: 'HTTP transition pending to rejected',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'rejected', changedBy: 'reviewer', reason: 'Prerequisite missing' }),
		expectedStatus: 200,
		check: (body) => {
			const request = body as EnrollmentRequestRecord;
			expect(request.status).toBe('rejected');
			expect(request.statusHistory).toHaveLength(2);
			expect(request.statusHistory.at(-1)).toEqual({ fromStatus: 'pending', toStatus: 'rejected', changedAt: request.updatedAt, changedBy: 'reviewer', reason: 'Prerequisite missing' });
		},
	},
	{
		title: 'HTTP transition pending to cancelled',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'cancelled', changedBy: 'reviewer', reason: 'Prerequisite missing' }),
		expectedStatus: 200,
		check: (body) => {
			const request = body as EnrollmentRequestRecord;
			expect(request.status).toBe('cancelled');
			expect(request.statusHistory).toHaveLength(2);
			expect(request.statusHistory.at(-1)).toEqual({ fromStatus: 'pending', toStatus: 'cancelled', changedAt: request.updatedAt, changedBy: 'reviewer', reason: 'Prerequisite missing' });
		},
	},
	{
		title: 'HTTP transition approved to cancelled',
		setup: async (state) => {
			state.request = await createRequest(state);
			await changeRequest(state.request.id, { status: 'approved', changedBy: 'first-reviewer' });
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'cancelled', changedBy: 'reviewer', reason: 'Prerequisite missing' }),
		expectedStatus: 200,
		check: (body) => {
			const request = body as EnrollmentRequestRecord;
			expect(request.status).toBe('cancelled');
			expect(request.statusHistory).toHaveLength(3);
			expect(request.statusHistory.at(-1)).toEqual({ fromStatus: 'approved', toStatus: 'cancelled', changedAt: request.updatedAt, changedBy: 'reviewer', reason: 'Prerequisite missing' });
		},
	},
	{
		title: 'Invalid transition',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'pending', changedBy: 'reviewer' }),
		expectedStatus: 409,
		expected: { error: { code: 'INVALID_STATUS_TRANSITION' } },
	},
	{
		title: 'Unknown transition status',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'unknown', changedBy: 'reviewer' }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{
		title: 'Missing transition status',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ changedBy: 'reviewer' }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{
		title: 'Object transition status',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: { $ne: null }, changedBy: 'reviewer' }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{
		title: 'Missing rejection reason',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'rejected', changedBy: 'reviewer' }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{
		title: 'Empty rejection reason',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'rejected', changedBy: 'reviewer', reason: '  ' }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{
		title: 'Nonstring rejection reason',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'rejected', changedBy: 'reviewer', reason: 42 }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{
		title: 'Blank operator',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'approved', changedBy: '  ' }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{
		title: 'Object operator',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests/${state.request?.id}/status`,
		method: 'PATCH',
		body: () => ({ status: 'approved', changedBy: {} }),
		expectedStatus: 400,
		expected: { error: { code: 'INVALID_REQUEST' } },
	},
	{
		title: 'Missing status change target',
		path: '/api/enrollment-requests/missing/status',
		method: 'PATCH',
		body: () => ({ status: 'approved', changedBy: 'reviewer' }),
		expectedStatus: 404,
		expected: { error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND' } },
	},
	{
		title: 'Lists enrollments by status',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: () => '/api/enrollment-requests?status=pending',
		expectedStatus: 200,
		check: (body, state) => {
			const items = (body as { items: EnrollmentRequestRecord[] }).items;
			expect(items.some((item) => item.id === state.request?.id)).toBe(true);
			expect(items.every((item) => item.status === 'pending')).toBe(true);
		},
	},
	{
		title: 'Lists enrollments by course',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: () => '/api/enrollment-requests?courseId=course-001',
		expectedStatus: 200,
		check: (body, state) => {
			const items = (body as { items: EnrollmentRequestRecord[] }).items;
			expect(items.some((item) => item.id === state.request?.id)).toBe(true);
			expect(items.every((item) => item.courseId === 'course-001')).toBe(true);
		},
	},
	{
		title: 'Lists enrollments by email',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests?learnerEmail=${encodeURIComponent(state.email.toUpperCase())}`,
		expectedStatus: 200,
		check: (body, state) => {
			const items = (body as { items: EnrollmentRequestRecord[] }).items;
			expect(items.some((item) => item.id === state.request?.id)).toBe(true);
			expect(items.every((item) => item.learnerEmail === state.email.toLowerCase())).toBe(true);
		},
	},
	{
		title: 'Lists enrollments by all filters',
		setup: async (state) => {
			state.request = await createRequest(state);
		},
		path: (state) => `/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=${encodeURIComponent(state.email.toUpperCase())}`,
		expectedStatus: 200,
		check: (body, state) => {
			const items = (body as { items: EnrollmentRequestRecord[] }).items;
			expect(items.some((item) => item.id === state.request?.id)).toBe(true);
			expect(items.every((item) => item.learnerEmail === state.email.toLowerCase())).toBe(true);
		},
	},
	{ title: 'Empty enrollment list', path: '/api/enrollment-requests?learnerEmail=absent@example.org', expectedStatus: 200, expected: { items: [] } },
	{ title: 'Invalid list status', path: '/api/enrollment-requests?status=unknown', expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{ title: 'Invalid list email', path: '/api/enrollment-requests?learnerEmail=bad', expectedStatus: 400, expected: { error: { code: 'INVALID_REQUEST' } } },
	{ title: 'Whitespace optional enrollment filters', path: '/api/enrollment-requests?status=%20&courseId=%20&learnerEmail=%20', expectedStatus: 200 },
];
const feature = await loadFeature('src/features/workflow.feature');
describeFeature(feature, ({ Scenario }) => {
	for (const test of cases) {
		Scenario(test.title, ({ Given, When, Then }) => {
			const state: ScenarioState = { email: `learner-${crypto.randomUUID()}@example.org` };
			let response: Response;
			Given('the sample application and scenario data', async () => {
				if (test.setup !== undefined) {
					await test.setup(state);
				}
			});
			When('the HTTP request is sent', async () => {
				const path = typeof test.path === 'string' ? test.path : test.path(state);
				const body = test.rawBody ?? (test.body === undefined ? undefined : JSON.stringify(test.body(state)));
				response = await app.request(path, { method: test.method ?? 'GET', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body }) });
			});
			Then('the HTTP contract is satisfied', async () => {
				expect(response.status).toBe(test.expectedStatus);
				const payload: unknown = await response.json();
				if (test.expected !== undefined) {
					expect(payload).toMatchObject(test.expected);
				}
				if (test.check !== undefined) {
					test.check(payload, state);
				}
				if (response.status >= 400) {
					expect(payload).toMatchObject({ error: { code: expect.any(String), message: expect.any(String), details: expect.any(Array) } });
					expect(JSON.stringify(payload)).not.toMatch(/stack|MongoServerError|_id|E11000/);
				}
			});
		});
	}
});
