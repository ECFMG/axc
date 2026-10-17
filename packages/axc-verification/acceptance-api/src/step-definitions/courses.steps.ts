import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
interface Course {
	id: string;
	title: string;
	summary: string;
	tags: string[];
	modality: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}
interface Catalog {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	error?: { code: string; message: string; details: { field: string; message: string }[] };
}
const sorted = (items: Course[], field: 'title' | 'createdAt' | 'updatedAt') => items.every((item, index) => index === 0 || (items[index - 1]?.[field] ?? '').localeCompare(item[field]) <= 0);
const contracts: Record<string, (body: Catalog) => boolean> = {
	defaults: (b) => b.page === 1 && b.pageSize === 10 && b.totalItems === 12 && b.totalPages === 2 && b.items.length === 10 && sorted(b.items, 'title'),
	security: (b) => b.totalItems === 4 && b.items.every((c) => [c.title, c.summary, ...c.tags].some((v) => v.toLowerCase().includes('security'))),
	online: (b) => b.totalItems === 4 && b.items.every((c) => c.modality === 'online'),
	active: (b) => b.totalItems === 7 && b.items.every((c) => c.status === 'active'),
	ai: (b) => b.totalItems === 3 && b.items.every((c) => c.tags.some((t) => t.toLowerCase() === 'ai')),
	combined: (b) => b.totalItems === 1 && b.items[0]?.id === 'course-001',
	combined2: (b) => b.totalItems === 1 && b.items[0]?.id === 'course-011',
	pagination: (b) => b.page === 1 && b.pageSize === 5 && b.items.length === 5 && b.totalItems === 12 && b.totalPages === 3,
	createdAt: (b) => b.items.length === 10 && sorted(b.items, 'createdAt'),
	updatedAt: (b) => b.items.length === 10 && sorted(b.items, 'updatedAt'),
	empty: (b) => b.items.length === 0 && b.totalItems === 0 && b.totalPages === 0 && b.page === 1 && b.pageSize === 10,
	error: (b) =>
		b.error?.code === 'INVALID_QUERY_PARAMETER' &&
		b.error.message === 'One or more query parameters are invalid.' &&
		b.error.details.length > 0 &&
		b.error.details.every((d) => typeof d.field === 'string' && typeof d.message === 'string'),
};
When('the client requests courses with query {string}', (query: string) => actorCalled('API client').attemptsTo(Send.a(GetRequest.to(`/api/courses${query ? `?${query}` : ''}`))));
Then('the courses response has status {int}', (status: number) => actorCalled('API client').attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));
Then('the courses response satisfies {string}', (contract: string) =>
	actorCalled('API client').attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`the ${contract} catalog contract`, async (actor) => {
					const body = await actor.answer(LastResponse.body<Catalog>());
					return contracts[contract]?.(body) ?? false;
				}),
			),
			equals(true),
		),
	),
);
