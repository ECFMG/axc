import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { ApplicationServices } from '@axc/application-services';
import { Domain } from '@axc/domain';
import { expect, vi } from 'vitest';
import { createRestApp } from '../../index.ts';

const feature = await loadFeature(new URL('./features/training.feature', import.meta.url).pathname);
const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) };
const record: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest = { id: 'request-001', ...input, status: 'pending', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', statusHistory: [] };
const mockServices = (): ApplicationServices => ({
	health: { getStatus: vi.fn() },
	Training: {
		Course: { queryCourses: vi.fn(async () => ({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 })) },
		EnrollmentRequest: { create: vi.fn(async () => record), queryById: vi.fn(async () => record), queryRequests: vi.fn(async () => []), updateStatus: vi.fn(async () => record) },
	},
});
describeFeature(feature, ({ Scenario }) => {
	Scenario('Default course search', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Default course search"', async () => {
			response = await app.request('/api/courses');
		});
		Then('the response is 200 for "Default course search"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith({ page: 1, pageSize: 10, sort: 'title' });
		});
	});
	Scenario('Combined course filters', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Combined course filters"', async () => {
			response = await app.request('/api/courses?q=Security&modality=online&status=active&tag=AI&page=2&pageSize=5&sort=createdAt');
		});
		Then('the response is 200 for "Combined course filters"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith({ q: 'Security', modality: 'online', status: 'active', tag: 'AI', page: 2, pageSize: 5, sort: 'createdAt' });
		});
	});
	Scenario('Course modality accepts online', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course modality accepts online"', async () => {
			response = await app.request('/api/courses?modality=online');
		});
		Then('the response is 200 for "Course modality accepts online"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ modality: 'online' }));
		});
	});
	Scenario('Course modality accepts in-person', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course modality accepts in-person"', async () => {
			response = await app.request('/api/courses?modality=in-person');
		});
		Then('the response is 200 for "Course modality accepts in-person"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ modality: 'in-person' }));
		});
	});
	Scenario('Course modality accepts hybrid', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course modality accepts hybrid"', async () => {
			response = await app.request('/api/courses?modality=hybrid');
		});
		Then('the response is 200 for "Course modality accepts hybrid"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ modality: 'hybrid' }));
		});
	});
	Scenario('Course status accepts draft', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course status accepts draft"', async () => {
			response = await app.request('/api/courses?status=draft');
		});
		Then('the response is 200 for "Course status accepts draft"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
		});
	});
	Scenario('Course status accepts active', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course status accepts active"', async () => {
			response = await app.request('/api/courses?status=active');
		});
		Then('the response is 200 for "Course status accepts active"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
		});
	});
	Scenario('Course status accepts retired', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course status accepts retired"', async () => {
			response = await app.request('/api/courses?status=retired');
		});
		Then('the response is 200 for "Course status accepts retired"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ status: 'retired' }));
		});
	});
	Scenario('Course sort accepts title', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course sort accepts title"', async () => {
			response = await app.request('/api/courses?sort=title');
		});
		Then('the response is 200 for "Course sort accepts title"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ sort: 'title' }));
		});
	});
	Scenario('Course sort accepts createdAt', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course sort accepts createdAt"', async () => {
			response = await app.request('/api/courses?sort=createdAt');
		});
		Then('the response is 200 for "Course sort accepts createdAt"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ sort: 'createdAt' }));
		});
	});
	Scenario('Course sort accepts updatedAt', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course sort accepts updatedAt"', async () => {
			response = await app.request('/api/courses?sort=updatedAt');
		});
		Then('the response is 200 for "Course sort accepts updatedAt"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith(expect.objectContaining({ sort: 'updatedAt' }));
		});
	});
	Scenario('Course modality rejects bad', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course modality rejects bad"', async () => {
			response = await app.request('/api/courses?modality=bad');
		});
		Then('the response is 400 for field "modality"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'modality' })]));
		});
	});
	Scenario('Course status rejects pending', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course status rejects pending"', async () => {
			response = await app.request('/api/courses?status=pending');
		});
		Then('the response is 400 for field "status"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'status' })]));
		});
	});
	Scenario('Course sort rejects -title', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course sort rejects -title"', async () => {
			response = await app.request('/api/courses?sort=-title');
		});
		Then('the response is 400 for field "sort"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'sort' })]));
		});
	});
	Scenario('Course page rejects 0', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course page rejects 0"', async () => {
			response = await app.request('/api/courses?page=0');
		});
		Then('the response is 400 for field "page"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'page' })]));
		});
	});
	Scenario('Course page rejects -1', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course page rejects -1"', async () => {
			response = await app.request('/api/courses?page=-1');
		});
		Then('the response is 400 for field "page"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'page' })]));
		});
	});
	Scenario('Course page rejects 1.5', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course page rejects 1.5"', async () => {
			response = await app.request('/api/courses?page=1.5');
		});
		Then('the response is 400 for field "page"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'page' })]));
		});
	});
	Scenario('Course page rejects 1e2', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course page rejects 1e2"', async () => {
			response = await app.request('/api/courses?page=1e2');
		});
		Then('the response is 400 for field "page"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'page' })]));
		});
	});
	Scenario('Course page rejects no', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course page rejects no"', async () => {
			response = await app.request('/api/courses?page=no');
		});
		Then('the response is 400 for field "page"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'page' })]));
		});
	});
	Scenario('Course page rejects 9007199254740992', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course page rejects 9007199254740992"', async () => {
			response = await app.request('/api/courses?page=9007199254740992');
		});
		Then('the response is 400 for field "page"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'page' })]));
		});
	});
	Scenario('Course pageSize rejects 0', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course pageSize rejects 0"', async () => {
			response = await app.request('/api/courses?pageSize=0');
		});
		Then('the response is 400 for field "pageSize"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'pageSize' })]));
		});
	});
	Scenario('Course pageSize rejects 51', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course pageSize rejects 51"', async () => {
			response = await app.request('/api/courses?pageSize=51');
		});
		Then('the response is 400 for field "pageSize"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'pageSize' })]));
		});
	});
	Scenario('Course pageSize rejects 2.5', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course pageSize rejects 2.5"', async () => {
			response = await app.request('/api/courses?pageSize=2.5');
		});
		Then('the response is 400 for field "pageSize"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'pageSize' })]));
		});
	});
	Scenario('Course pageSize rejects abc', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Course pageSize rejects abc"', async () => {
			response = await app.request('/api/courses?pageSize=abc');
		});
		Then('the response is 400 for field "pageSize"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'pageSize' })]));
		});
	});
	Scenario('Blank course options are absent', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Blank course options are absent"', async () => {
			response = await app.request('/api/courses?q=%20&modality=%20&status=&tag=&page=&pageSize=%20&sort=');
		});
		Then('the response is 200 for "Blank course options are absent"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.Course.queryCourses).toHaveBeenCalledWith({ page: 1, pageSize: 10, sort: 'title' });
		});
	});
	Scenario('Page size maximum accepted', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Page size maximum accepted"', async () => {
			response = await app.request('/api/courses?pageSize=50');
		});
		Then('the response is 200 for "Page size maximum accepted"', () => {
			expect(response.status).toBe(200);
		});
	});
	Scenario('Creates pending request', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Creates pending request"', async () => {
			response = await app.request('/api/enrollment-requests', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) }),
			});
		});
		Then('the response is 201 for "Creates pending request"', () => {
			expect(response.status).toBe(201);
			expect(services.Training.EnrollmentRequest.create).toHaveBeenCalledWith({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) });
		});
	});
	Scenario('Invalid email', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Invalid email"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ ...input, learnerEmail: 'bad' }) });
		});
		Then('the response is 400 for field "learnerEmail"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'learnerEmail' })]));
		});
	});
	Scenario('Short justification', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Short justification"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ ...input, justification: 'x'.repeat(19) }) });
		});
		Then('the response is 400 for field "justification"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'justification' })]));
		});
	});
	Scenario('Long justification', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Long justification"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ ...input, justification: 'x'.repeat(501) }) });
		});
		Then('the response is 400 for field "justification"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'justification' })]));
		});
	});
	Scenario('Missing course id', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Missing course id"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ ...input, courseId: '' }) });
		});
		Then('the response is 400 for field "courseId"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'courseId' })]));
		});
	});
	Scenario('Non-string course id', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Non-string course id"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ ...input, courseId: { $ne: '' } }) });
		});
		Then('the response is 400 for field "courseId"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'courseId' })]));
		});
	});
	Scenario('Null create body', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Null create body"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify(null) });
		});
		Then('the response is 400 for field "body"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'body' })]));
		});
	});
	Scenario('Array create body', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Array create body"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify([]) });
		});
		Then('the response is 400 for field "body"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'body' })]));
		});
	});
	Scenario('Justification upper boundary accepted', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Justification upper boundary accepted"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ ...input, justification: 'x'.repeat(500) }) });
		});
		Then('the response is 201 for "Justification upper boundary accepted"', () => {
			expect(response.status).toBe(201);
		});
	});
	Scenario('Malformed JSON create', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Malformed JSON create"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: '{' });
		});
		Then('the response is 400 for field "body"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'body' })]));
		});
	});
	Scenario('Retrieves enrollment request', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Retrieves enrollment request"', async () => {
			response = await app.request('/api/enrollment-requests/request-001');
		});
		Then('the response is 200 for "Retrieves enrollment request"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.EnrollmentRequest.queryById).toHaveBeenCalledWith({ id: 'request-001' });
		});
	});
	Scenario('Filters enrollment requests', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Filters enrollment requests"', async () => {
			response = await app.request('/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org');
		});
		Then('the response is 200 for "Filters enrollment requests"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.EnrollmentRequest.queryRequests).toHaveBeenCalledWith({ status: 'pending', courseId: 'course-001', learnerEmail: 'learner@example.org' });
		});
	});
	Scenario('Blank enrollment filters absent', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Blank enrollment filters absent"', async () => {
			response = await app.request('/api/enrollment-requests?status=%20&courseId=&learnerEmail=%20');
		});
		Then('the response is 200 for "Blank enrollment filters absent"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.EnrollmentRequest.queryRequests).toHaveBeenCalledWith({});
		});
	});
	Scenario('Invalid enrollment status filter', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Invalid enrollment status filter"', async () => {
			response = await app.request('/api/enrollment-requests?status=bad');
		});
		Then('the response is 400 for field "status"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'status' })]));
		});
	});
	Scenario('Invalid enrollment email filter', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Invalid enrollment email filter"', async () => {
			response = await app.request('/api/enrollment-requests?learnerEmail=bad');
		});
		Then('the response is 400 for field "learnerEmail"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'learnerEmail' })]));
		});
	});
	Scenario('List accepts status pending', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "List accepts status pending"', async () => {
			response = await app.request('/api/enrollment-requests?status=pending');
		});
		Then('the response is 200 for "List accepts status pending"', () => {
			expect(response.status).toBe(200);
		});
	});
	Scenario('List accepts status approved', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "List accepts status approved"', async () => {
			response = await app.request('/api/enrollment-requests?status=approved');
		});
		Then('the response is 200 for "List accepts status approved"', () => {
			expect(response.status).toBe(200);
		});
	});
	Scenario('List accepts status rejected', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "List accepts status rejected"', async () => {
			response = await app.request('/api/enrollment-requests?status=rejected');
		});
		Then('the response is 200 for "List accepts status rejected"', () => {
			expect(response.status).toBe(200);
		});
	});
	Scenario('List accepts status cancelled', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "List accepts status cancelled"', async () => {
			response = await app.request('/api/enrollment-requests?status=cancelled');
		});
		Then('the response is 200 for "List accepts status cancelled"', () => {
			expect(response.status).toBe(200);
		});
	});
	Scenario('Approves enrollment request', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Approves enrollment request"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: JSON.stringify({ status: 'approved', changedBy: 'reviewer' }) });
		});
		Then('the response is 200 for "Approves enrollment request"', () => {
			expect(response.status).toBe(200);
			expect(services.Training.EnrollmentRequest.updateStatus).toHaveBeenCalledWith({ id: 'request-001', status: 'approved', changedBy: 'reviewer' });
		});
	});
	Scenario('Invalid target status', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Invalid target status"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: JSON.stringify({ status: 'bad', changedBy: 'reviewer' }) });
		});
		Then('the response is 400 for field "status"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'status' })]));
		});
	});
	Scenario('Missing operator', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Missing operator"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
		});
		Then('the response is 400 for field "changedBy"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'changedBy' })]));
		});
	});
	Scenario('Blank operator', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Blank operator"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: JSON.stringify({ status: 'approved', changedBy: '   ' }) });
		});
		Then('the response is 400 for field "changedBy"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'changedBy' })]));
		});
	});
	Scenario('Missing rejection reason', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Missing rejection reason"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: JSON.stringify({ status: 'rejected', changedBy: 'reviewer' }) });
		});
		Then('the response is 400 for field "reason"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'reason' })]));
		});
	});
	Scenario('Blank rejection reason', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Blank rejection reason"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: JSON.stringify({ status: 'rejected', changedBy: 'reviewer', reason: '   ' }) });
		});
		Then('the response is 400 for field "reason"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'reason' })]));
		});
	});
	Scenario('Non-string reason', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Non-string reason"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: JSON.stringify({ status: 'cancelled', changedBy: 'reviewer', reason: {} }) });
		});
		Then('the response is 400 for field "reason"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'reason' })]));
		});
	});
	Scenario('Malformed JSON update', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Malformed JSON update"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: '{' });
		});
		Then('the response is 400 for field "body"', async () => {
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'body' })]));
		});
	});
	Scenario('Maps COURSE_NOT_FOUND', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			vi.mocked(services.Training.EnrollmentRequest.create).mockRejectedValue(new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('COURSE_NOT_FOUND'));
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Maps COURSE_NOT_FOUND"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) }) });
		});
		Then('the response is 404 for "Maps COURSE_NOT_FOUND"', async () => {
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error.code).toBe('COURSE_NOT_FOUND');
		});
	});
	Scenario('Maps COURSE_NOT_ACTIVE', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			vi.mocked(services.Training.EnrollmentRequest.create).mockRejectedValue(new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('COURSE_NOT_ACTIVE'));
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Maps COURSE_NOT_ACTIVE"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) }) });
		});
		Then('the response is 409 for "Maps COURSE_NOT_ACTIVE"', async () => {
			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.error.code).toBe('COURSE_NOT_ACTIVE');
		});
	});
	Scenario('Maps DUPLICATE_ACTIVE_REQUEST', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			vi.mocked(services.Training.EnrollmentRequest.create).mockRejectedValue(new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('DUPLICATE_ACTIVE_REQUEST'));
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Maps DUPLICATE_ACTIVE_REQUEST"', async () => {
			response = await app.request('/api/enrollment-requests', { method: 'POST', body: JSON.stringify({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) }) });
		});
		Then('the response is 409 for "Maps DUPLICATE_ACTIVE_REQUEST"', async () => {
			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
		});
	});
	Scenario('Maps ENROLLMENT_REQUEST_NOT_FOUND', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			vi.mocked(services.Training.EnrollmentRequest.queryById).mockRejectedValue(new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('ENROLLMENT_REQUEST_NOT_FOUND'));
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Maps ENROLLMENT_REQUEST_NOT_FOUND"', async () => {
			response = await app.request('/api/enrollment-requests/missing', { method: 'GET' });
		});
		Then('the response is 404 for "Maps ENROLLMENT_REQUEST_NOT_FOUND"', async () => {
			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
		});
	});
	Scenario('Maps INVALID_STATUS_TRANSITION', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			vi.mocked(services.Training.EnrollmentRequest.updateStatus).mockRejectedValue(new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('INVALID_STATUS_TRANSITION'));
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Maps INVALID_STATUS_TRANSITION"', async () => {
			response = await app.request('/api/enrollment-requests/request-001/status', { method: 'PATCH', body: JSON.stringify({ status: 'approved', changedBy: 'reviewer' }) });
		});
		Then('the response is 409 for "Maps INVALID_STATUS_TRANSITION"', async () => {
			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.error.code).toBe('INVALID_STATUS_TRANSITION');
		});
	});
	Scenario('Unexpected errors are sanitized', ({ Given, When, Then }) => {
		let services: ApplicationServices;
		let app: ReturnType<typeof createRestApp>;
		let response: Response;
		Given('training application services', () => {
			services = mockServices();
			vi.mocked(services.Training.EnrollmentRequest.queryById).mockRejectedValue(new Error('secret database internal identifier'));
			app = createRestApp({ forRequest: async () => services });
		});
		When('the client performs "Unexpected errors are sanitized"', async () => {
			response = await app.request('/api/enrollment-requests/request-001');
		});
		Then('the response is 500 for "Unexpected errors are sanitized"', async () => {
			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error.code).toBe('INTERNAL_ERROR');
			expect(JSON.stringify(body)).not.toContain('secret');
		});
	});
});
