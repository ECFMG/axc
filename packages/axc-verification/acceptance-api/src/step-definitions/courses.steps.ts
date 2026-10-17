import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question, Task } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

interface Course {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
interface CatalogResponse {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	error?: { code: string; message: string; details: { field: string; message: string }[] };
}
const resolved = <T>(value: Answerable<Promise<T>>): Answerable<T> => value as unknown as Answerable<T>;
const client = () => actorCalled('Catalog reader');
const searchCourses = (query: string) => Task.where(`#actor searches the catalog with ${query}`, Send.a(GetRequest.to(`/api/courses?${query}`)));
const matchesCatalog = (status: number, count: number, check: string) =>
	Question.about(`catalog ${check} contract`, async (actor) => {
		const body = await actor.answer(LastResponse.body<CatalogResponse>());
		if (status === 400) {
			return body.error?.code === 'INVALID_QUERY_PARAMETER' && body.error.message === 'One or more query parameters are invalid.' && body.error.details.some((detail) => detail.field === check && detail.message.length > 0);
		}
		if (!Array.isArray(body.items) || body.items.length !== count) {
			return false;
		}
		const items = body.items;
		if (check === 'default') {
			return (
				body.page === 1 &&
				body.pageSize === 10 &&
				body.totalItems === 12 &&
				body.totalPages === 2 &&
				items.every((item) => Object.keys(item).length === 8 && new Date(item.createdAt).toISOString() === item.createdAt && new Date(item.updatedAt).toISOString() === item.updatedAt) &&
				items.every((item, index) => index === 0 || (items[index - 1]?.title ?? '') <= item.title)
			);
		}
		if (check === 'security') {
			return items.every((item) => [item.title, item.summary, ...item.tags].some((text) => text.toLowerCase().includes('security')));
		}
		if (check === 'online') {
			return items.every((item) => item.modality === 'online');
		}
		if (check === 'active') {
			return items.every((item) => item.status === 'active');
		}
		if (check === 'ai') {
			return items.every((item) => item.tags.some((tag) => tag.toLowerCase() === 'ai'));
		}
		if (check === 'page') {
			return body.page === 2 && body.pageSize === 5 && body.totalItems === 12 && body.totalPages === 3 && items[0]?.id === 'course-006';
		}
		if (check === 'createdAt' || check === 'updatedAt') {
			return items.every((item, index) => index === 0 || (items[index - 1]?.[check] ?? '') <= item[check]);
		}
		if (check === 'combined') {
			return items[0]?.id === 'course-001' && body.totalItems === 1;
		}
		if (check === 'combinedTag') {
			return items[0]?.id === 'course-012' && body.totalItems === 1;
		}
		if (check === 'empty') {
			return body.page === 1 && body.pageSize === 10 && body.totalItems === 0 && body.totalPages === 0;
		}
		return false;
	});
When('the client searches courses with {string}', (query: string) => client().attemptsTo(searchCourses(query)));
Then('the catalog response is {int} with {int} items for {string}', (status: number, count: number, check: string) =>
	client().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status)), Ensure.that(resolved(matchesCatalog(status, count, check)), equals(true))),
);
