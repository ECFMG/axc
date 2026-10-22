import { Domain } from '@axc/domain';
import type { CourseReadModel, DataSources, EnrollmentRequestReadModel, EnrollmentRequestSearchCriteria } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { create } from './create.ts';
import { getById } from './get-by-id.ts';
import { queryEnrollmentRequests } from './query-enrollment-requests.ts';
import { update } from './update.ts';

// Stubs the data sources but runs the real domain aggregate on plain props, so the use cases are
// tested with the actual workflow rules.

type Props = Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestProps;
type Aggregate = Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest<Props>;

const COURSE_ID = '650000000000000000000001';
const REQUEST_ID = '6600000000000000000000aa';
const justification = 'I need this course to prepare for upcoming secure development work.';

const course = (status: CourseReadModel['status'] = 'active'): CourseReadModel => ({
	id: COURSE_ID,
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online',
	status,
	tags: ['ai', 'security'],
	createdAt: new Date('2026-01-15T00:00:00.000Z'),
	updatedAt: new Date('2026-06-01T00:00:00.000Z'),
});

const blankProps = (): Props => ({
	id: REQUEST_ID,
	courseId: '',
	learnerEmail: '',
	justification: '',
	status: 'pending',
	statusHistory: [],
	createdAt: new Date('2026-06-27T10:00:00.000Z'),
	updatedAt: new Date('2026-06-27T10:00:00.000Z'),
	schemaVersion: '1.0.0',
});

const passport = Domain.Contexts.PassportFactory.forSystem();
const pendingRequest = (): Aggregate => Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest.getNewInstance(blankProps(), passport, { course: course(), learnerEmail: 'learner@example.org', justification });

interface StubOptions {
	course?: CourseReadModel | null;
	hasActiveRequest?: boolean;
	stored?: Aggregate;
	saveError?: unknown;
	searchItems?: EnrollmentRequestReadModel[];
}

function stubDataSources(options: StubOptions = {}) {
	const saved: Aggregate[] = [];
	const searches: EnrollmentRequestSearchCriteria[] = [];
	const repo = {
		getNewInstance: (input: Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestNewInput) => Promise.resolve(Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest.getNewInstance(blankProps(), passport, input)),
		get: () => (options.stored ? Promise.resolve(options.stored) : Promise.reject(new Error('not found'))),
		save: (item: Aggregate) => {
			if (options.saveError) {
				return Promise.reject(options.saveError);
			}
			saved.push(item);
			return Promise.resolve(item);
		},
	};
	const EnrollmentRequestReadRepo = {
		getById: (id: string) => Promise.resolve(options.stored && id === REQUEST_ID ? options.stored : null),
		hasActiveRequest: () => Promise.resolve(options.hasActiveRequest ?? false),
		search: (criteria: EnrollmentRequestSearchCriteria) => {
			searches.push(criteria);
			return Promise.resolve({ items: options.searchItems ?? [], totalItems: options.searchItems?.length ?? 0 });
		},
	};
	const dataSources = {
		domainDataSource: { Enrollment: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: { withScopedTransaction: (fn: (r: typeof repo) => Promise<void>) => fn(repo) } } } },
		readonlyDataSource: {
			Catalog: { Course: { CourseReadRepo: { getById: () => Promise.resolve(options.course === undefined ? course() : options.course) } } },
			Enrollment: { EnrollmentRequest: { EnrollmentRequestReadRepo } },
		},
	} as unknown as DataSources;
	return { dataSources, saved, searches };
}

describe('create enrollment request', () => {
	const command = { courseId: COURSE_ID, learnerEmail: 'Learner@Example.org', justification };

	it('B-AC2 B-AC12 creates a pending request with a creation history entry', async () => {
		const { dataSources, saved } = stubDataSources();
		const result = await create(dataSources)(command);

		expect(saved).toHaveLength(1);
		expect(result).toStrictEqual({
			ok: true,
			value: {
				id: REQUEST_ID,
				courseId: COURSE_ID,
				learnerEmail: 'learner@example.org',
				justification,
				status: 'pending',
				createdAt: '2026-06-27T10:00:00.000Z',
				updatedAt: '2026-06-27T10:00:00.000Z',
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), changedBy: 'system', reason: null }],
			},
		});
	});

	it('B-AC3 returns COURSE_NOT_FOUND for a missing course', async () => {
		const { dataSources, saved } = stubDataSources({ course: null });
		expect(await create(dataSources)(command)).toMatchObject({ ok: false, error: { code: 'COURSE_NOT_FOUND' } });
		expect(saved).toHaveLength(0);
	});

	it.each(['draft', 'retired'] as const)('B-AC4 returns COURSE_NOT_ACTIVE for a %s course', async (status) => {
		const { dataSources, saved } = stubDataSources({ course: course(status) });
		expect(await create(dataSources)(command)).toMatchObject({ ok: false, error: { code: 'COURSE_NOT_ACTIVE' } });
		expect(saved).toHaveLength(0);
	});

	it('B-AC5 maps domain validation errors to INVALID_REQUEST with the field', async () => {
		const { dataSources } = stubDataSources();
		expect(await create(dataSources)({ ...command, learnerEmail: 'nope' })).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST', details: [{ field: 'learnerEmail' }] } });
		expect(await create(dataSources)({ ...command, justification: 'short' })).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST', details: [{ field: 'justification' }] } });
	});

	it('B-AC6 returns DUPLICATE_ACTIVE_REQUEST when the learner already has an active request', async () => {
		const { dataSources, saved } = stubDataSources({ hasActiveRequest: true });
		expect(await create(dataSources)(command)).toMatchObject({ ok: false, error: { code: 'DUPLICATE_ACTIVE_REQUEST' } });
		expect(saved).toHaveLength(0);
	});

	it('B-AC6 maps a duplicate-key error from a concurrent create to DUPLICATE_ACTIVE_REQUEST', async () => {
		const { dataSources } = stubDataSources({ saveError: Object.assign(new Error('E11000 duplicate key'), { code: 11000 }) });
		expect(await create(dataSources)(command)).toMatchObject({ ok: false, error: { code: 'DUPLICATE_ACTIVE_REQUEST' } });
	});

	it('rethrows unexpected errors', async () => {
		const { dataSources } = stubDataSources({ saveError: new Error('connection lost') });
		await expect(create(dataSources)(command)).rejects.toThrow('connection lost');
	});
});

describe('get enrollment request by id', () => {
	it('B-AC7 returns the request with its status history', async () => {
		const { dataSources } = stubDataSources({ stored: pendingRequest() });
		const result = await getById(dataSources)({ id: REQUEST_ID });
		expect(result).toMatchObject({ ok: true, value: { id: REQUEST_ID, status: 'pending', statusHistory: [{ fromStatus: null, toStatus: 'pending' }] } });
	});

	it('B-AC7 returns ENROLLMENT_REQUEST_NOT_FOUND for an unknown id', async () => {
		const { dataSources } = stubDataSources();
		expect(await getById(dataSources)({ id: 'missing' })).toMatchObject({ ok: false, error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND' } });
	});
});

describe('query enrollment requests', () => {
	it('B-AC8 passes status, courseId, and learnerEmail filters to the read repository and pages the result', async () => {
		const stored = pendingRequest();
		const { dataSources, searches } = stubDataSources({ searchItems: [stored] });
		const command = { status: 'pending' as const, courseId: COURSE_ID, learnerEmail: 'learner@example.org', page: 1, pageSize: 10 };

		const page = await queryEnrollmentRequests(dataSources)(command);

		expect(searches).toStrictEqual([command]);
		expect(page).toMatchObject({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1, items: [{ id: REQUEST_ID, courseId: COURSE_ID, status: 'pending' }] });
	});
});

describe('update enrollment request status', () => {
	it('B-AC9 B-AC12 applies a valid transition and returns the appended history', async () => {
		const stored = pendingRequest();
		const { dataSources, saved } = stubDataSources({ stored });

		const result = await update(dataSources)({ id: REQUEST_ID, status: 'approved', changedBy: 'reviewer@example.org' });

		expect(saved).toStrictEqual([stored]);
		expect(result).toMatchObject({ ok: true, value: { status: 'approved', statusHistory: [{ toStatus: 'pending' }, { fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer@example.org', reason: null }] } });
	});

	it('B-AC10 returns INVALID_STATUS_TRANSITION for a disallowed transition', async () => {
		const stored = pendingRequest();
		stored.changeStatus({ status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite missing.' });
		const { dataSources, saved } = stubDataSources({ stored });

		expect(await update(dataSources)({ id: REQUEST_ID, status: 'approved', changedBy: 'reviewer@example.org' })).toMatchObject({ ok: false, error: { code: 'INVALID_STATUS_TRANSITION' } });
		expect(saved).toHaveLength(0);
	});

	it('B-AC10 treats a concurrent update (VersionError) as a conflict', async () => {
		const versionError = Object.assign(new Error('No matching document found'), { name: 'VersionError' });
		const { dataSources } = stubDataSources({ stored: pendingRequest(), saveError: versionError });
		expect(await update(dataSources)({ id: REQUEST_ID, status: 'approved', changedBy: 'reviewer@example.org' })).toMatchObject({ ok: false, error: { code: 'INVALID_STATUS_TRANSITION' } });
	});

	it('B-AC11 returns INVALID_REQUEST when rejecting without a reason', async () => {
		const { dataSources, saved } = stubDataSources({ stored: pendingRequest() });
		expect(await update(dataSources)({ id: REQUEST_ID, status: 'rejected', changedBy: 'reviewer@example.org' })).toMatchObject({
			ok: false,
			error: { code: 'INVALID_REQUEST', details: [{ field: 'reason' }] },
		});
		expect(saved).toHaveLength(0);
	});

	it('returns ENROLLMENT_REQUEST_NOT_FOUND before opening a transaction', async () => {
		const { dataSources } = stubDataSources();
		expect(await update(dataSources)({ id: 'missing', status: 'approved', changedBy: 'reviewer@example.org' })).toMatchObject({ ok: false, error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND' } });
	});
});
