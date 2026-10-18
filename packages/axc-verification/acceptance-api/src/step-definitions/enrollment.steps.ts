import { When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

interface Enrollment {
	id: string;
	courseId: string;
	learnerEmail: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: { fromStatus: string | null; toStatus: string; changedBy: string; changedAt: string; reason: string | null }[];
}
const actor = () => actorCalled('Enrollment client');
const check = async <T>(actual: T, expected: T) => actor().attemptsTo(Ensure.that(actual, equals(expected)));
const response = async <T>() => actor().answer(LastResponse.body<T>());
async function get(path: string, status = 200) {
	await actor().attemptsTo(Send.a(GetRequest.to(path)));
	await check(await actor().answer(LastResponse.status()), status);
}
async function post(body: object, status = 201) {
	await actor().attemptsTo(Send.a(PostRequest.to('/api/enrollment-requests').with(body)));
	await check(await actor().answer(LastResponse.status()), status);
}
async function patch(id: string, status: string, code = 200, reason?: string) {
	await actor().attemptsTo(Send.a(PatchRequest.to(`/api/enrollment-requests/${id}/status`).with({ status, changedBy: 'reviewer@example.org', ...(reason === undefined ? {} : { reason }) })));
	await check(await actor().answer(LastResponse.status()), code);
}
async function error(code: string) {
	await check((await response<{ error: { code: string } }>()).error.code, code);
}
When('the live enrollment API proves {string}', async (criterion: string) => {
	const input = { courseId: 'course-001', learnerEmail: `learner-${crypto.randomUUID()}@example.org`, justification: 'I need training for upcoming project work.' };
	if (criterion === 'B-AC3') {
		await post({ ...input, courseId: 'missing' }, 404);
		await error('COURSE_NOT_FOUND');
		return;
	}
	if (criterion === 'B-AC4') {
		for (const courseId of ['course-011', 'course-012']) {
			await post({ ...input, courseId }, 409);
			await error('COURSE_NOT_ACTIVE');
		}
		return;
	}
	if (criterion === 'B-AC5') {
		for (const extra of [{ learnerEmail: 'bad' }, { justification: 'short' }, { justification: 'x'.repeat(501) }]) {
			await post({ ...input, ...extra }, 400);
			await error('INVALID_REQUEST');
		}
		return;
	}
	await post(input);
	const initial = await response<Enrollment>();
	await check(initial.status, 'pending');
	await check(initial.statusHistory.length, 1);
	await check(initial.statusHistory[0]?.fromStatus, null);
	await check(initial.statusHistory[0]?.changedBy, 'system');
	if (criterion === 'B-AC2') return;
	if (criterion === 'B-AC6') {
		await post({ ...input, learnerEmail: input.learnerEmail.toUpperCase() }, 409);
		await error('DUPLICATE_ACTIVE_REQUEST');
		await patch(initial.id, 'approved');
		await post(input, 409);
		await error('DUPLICATE_ACTIVE_REQUEST');
		return;
	}
	if (criterion === 'B-AC7') {
		await get(`/api/enrollment-requests/${initial.id}`);
		await check(await response<Enrollment>(), initial);
		await get('/api/enrollment-requests/missing', 404);
		await error('ENROLLMENT_REQUEST_NOT_FOUND');
		return;
	}
	if (criterion === 'B-AC8') {
		await post({ ...input, courseId: 'course-002' });
		await patch(initial.id, 'approved');
		for (const query of [
			`learnerEmail=${input.learnerEmail}`,
			`status=approved&learnerEmail=${input.learnerEmail}`,
			`courseId=course-001&learnerEmail=${input.learnerEmail}`,
			`status=approved&courseId=course-001&learnerEmail=${input.learnerEmail}`,
		]) {
			await get(`/api/enrollment-requests?${query}`);
			const items = (await response<{ items: Enrollment[] }>()).items;
			await check(items.length, query.startsWith('learnerEmail') ? 2 : 1);
			await check(items[0]?.learnerEmail, input.learnerEmail);
		}
		return;
	}
	if (criterion === 'B-AC9' || criterion === 'B-AC12') {
		await patch(initial.id, 'approved');
		await patch(initial.id, 'cancelled');
		await get(`/api/enrollment-requests/${initial.id}`);
		const b = await response<Enrollment>();
		await check(b.status, 'cancelled');
		await check(b.statusHistory.length, 3);
		await check(
			b.statusHistory.map((h) => h.toStatus),
			['pending', 'approved', 'cancelled'],
		);
		await check(b.statusHistory[1]?.fromStatus, 'pending');
		await check(b.statusHistory[2]?.fromStatus, 'approved');
		await check(b.statusHistory[1]?.changedBy, 'reviewer@example.org');
		await check(b.updatedAt, b.statusHistory[2]?.changedAt ?? '');
		for (const status of ['rejected', 'cancelled']) {
			await post({ ...input, learnerEmail: `${status}-${input.learnerEmail}` });
			const next = await response<Enrollment>();
			await patch(next.id, status, 200, 'Reviewed prerequisites');
			await check((await response<Enrollment>()).statusHistory.length, 2);
		}
		return;
	}
	if (criterion === 'B-AC10') {
		await patch(initial.id, 'pending', 409);
		await error('INVALID_STATUS_TRANSITION');
		await patch(initial.id, 'rejected', 200, 'Prerequisite missing');
		await patch(initial.id, 'approved', 409);
		await error('INVALID_STATUS_TRANSITION');
		await get(`/api/enrollment-requests/${initial.id}`);
		await check((await response<Enrollment>()).statusHistory.length, 2);
		return;
	}
	if (criterion === 'B-AC11') {
		await patch(initial.id, 'rejected', 400);
		await error('INVALID_REQUEST');
		await patch(initial.id, 'rejected', 400, '  ');
		await error('INVALID_REQUEST');
		await get(`/api/enrollment-requests/${initial.id}`);
		await check(await response<Enrollment>(), initial);
		return;
	}
	throw new Error(`Unknown criterion ${criterion}`);
});
When('the live catalog API proves {string}', async (criterion: string) => {
	if (criterion === 'A-AC8') {
		for (const query of ['modality=remote', 'status=bad', 'page=0', 'pageSize=51', 'sort=id', 'page=99999999999999999999']) {
			await get(`/api/courses?${query}`, 400);
			await error('INVALID_QUERY_PARAMETER');
		}
		return;
	}
	const query: Record<string, string> = {
		'A-AC1': '',
		'A-AC2': 'q=SeCuRiTy',
		'A-AC3': 'modality=online',
		'A-AC4': 'status=active',
		'A-AC5': 'tag=AI',
		'A-AC6': 'page=1&pageSize=5',
		'A-AC7': 'sort=createdAt',
		'A-AC9': 'q=nomatchzz',
		'B-AC1': 'q=security&modality=online&status=active',
	};
	await get(`/api/courses?${query[criterion] ?? ''}`);
	const b = await response<{ items: { id: string; modality: string; status: string; tags: string[]; createdAt: string }[]; totalItems: number; page: number; pageSize: number }>();
	if (criterion === 'A-AC1') {
		await check(b.page, 1);
		await check(b.pageSize, 10);
		await check(b.totalItems, 12);
		await check(b.items.length, 10);
	}
	if (criterion === 'A-AC2') {
		await check(b.totalItems, 7);
		await check(
			b.items.some((c) => c.id === 'course-002'),
			true,
		);
		await check(
			b.items.some((c) => c.id === 'course-005'),
			true,
		);
	}
	if (criterion === 'A-AC3') {
		await check(b.items.length, 4);
		await check(
			b.items.every((c) => c.modality === 'online'),
			true,
		);
	}
	if (criterion === 'A-AC4') {
		await check(b.items.length, 10);
		await check(
			b.items.every((c) => c.status === 'active'),
			true,
		);
	}
	if (criterion === 'A-AC5') {
		await check(b.items.length, 6);
		await check(
			b.items.every((c) => c.tags.includes('ai')),
			true,
		);
	}
	if (criterion === 'A-AC6') {
		await check(b.items.length, 5);
		await check(b.pageSize, 5);
		await check(b.totalItems, 12);
	}
	if (criterion === 'A-AC7') {
		const dates = b.items.map((c) => c.createdAt);
		await check(dates.length, 10);
		await check(dates, [...dates].sort());
	}
	if (criterion === 'A-AC9') {
		await check(b.items.length, 0);
		await check(b.totalItems, 0);
	}
	if (criterion === 'B-AC1') {
		await check(b.items.length, 2);
		await check(
			b.items.every((c) => c.modality === 'online' && c.status === 'active'),
			true,
		);
	}
});
