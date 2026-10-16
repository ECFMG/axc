import { Given, Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question, Task } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('Catalog reader');
interface CatalogResponse {
	items: { id: string; title: string; summary: string; modality: string; status: string; tags: string[]; createdAt: string; updatedAt: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

Given('the sample course catalog', () => {
	/* The local API startup seeds the catalog. */
});
When('the client requests courses {string}', (query: string) => actor().attemptsTo(Task.where(`#actor searches the course catalog`, Send.a(GetRequest.to(`/api/courses${query}`)))));
Then('the catalog contains {string} on page {int} of size {int} with total {int}', (ids: string, page: number, size: number, total: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(LastResponse.status()), equals(200)),
		Ensure.that(
			resolved(
				Question.about('the catalog result contract', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CatalogResponse>());
					const expectedIds = ids === '' ? [] : ids.split(',');
					return (
						JSON.stringify(body.items.map((item) => item.id)) === JSON.stringify(expectedIds) &&
						body.page === page &&
						body.pageSize === size &&
						body.totalItems === total &&
						body.totalPages === Math.ceil(total / size) &&
						body.items.every(
							(item) =>
								typeof item.title === 'string' &&
								typeof item.summary === 'string' &&
								['online', 'in-person', 'hybrid'].includes(item.modality) &&
								['draft', 'active', 'retired'].includes(item.status) &&
								Array.isArray(item.tags) &&
								item.tags.every((tag) => typeof tag === 'string') &&
								new Date(item.createdAt).toISOString() === item.createdAt &&
								new Date(item.updatedAt).toISOString() === item.updatedAt &&
								Object.keys(item).length === 8,
						)
					);
				}),
			),
			equals(true),
		),
	),
);
Then('the catalog rejects field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(LastResponse.status()), equals(400)),
		Ensure.that(
			resolved(
				Question.about('the catalog validation error', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<{ error: { code: string; message: string; details: { field: string; message: string }[] } }>());
					return (
						body.error.code === 'INVALID_QUERY_PARAMETER' &&
						body.error.message === 'One or more query parameters are invalid.' &&
						body.error.details.length === 1 &&
						body.error.details[0]?.field === field &&
						typeof body.error.details[0]?.message === 'string'
					);
				}),
			),
			equals(true),
		),
	),
);
