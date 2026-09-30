import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CatalogItem {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CatalogPage {
	items: CatalogItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	error?: { code: string; message: string; details: { field: string; message: string }[] };
}

const actor = () => actorCalled('API client');

const catalog = <T>(description: string, extract: (body: CatalogPage) => T): Answerable<T> =>
	resolved(
		Question.about(description, async (currentActor) => {
			const body = await currentActor.answer(LastResponse.body<CatalogPage>());
			return extract(body);
		}),
	);

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the catalog returns {int} items', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			catalog('the item count', (body) => body.items.length),
			equals(count),
		),
	),
);

Then('the catalog page is page {int} of size {int} with {int} total items across {int} pages', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(
			catalog('the pagination metadata', (body) => [body.page, body.pageSize, body.totalItems, body.totalPages].join('/')),
			equals([page, pageSize, totalItems, totalPages].join('/')),
		),
	),
);

Then('the catalog item ids are {string}', (ids: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalog('the item ids', (body) => body.items.map((item) => item.id).join(',')),
			equals(ids),
		),
	),
);

Then('every catalog item has {string} equal to {string}', (field: string, value: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalog(`the distinct ${field} values`, (body) => [...new Set(body.items.map((item) => String(item[field as keyof CatalogItem])))].join(',')),
			equals(value),
		),
	),
);

Then('the catalog items are sorted ascending by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalog(`whether the items are sorted by ${field}`, (body) => {
				const values = body.items.map((item) => String(item[field as keyof CatalogItem]));
				return JSON.stringify(values) === JSON.stringify([...values].sort());
			}),
			equals(true),
		),
	),
);

Then('the catalog error code is {string} naming {string}', (code: string, field: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalog('the error code and offending fields', (body) => `${body.error?.code}:${(body.error?.details ?? []).map((detail) => detail.field).join(',')}`),
			equals(`${code}:${field}`),
		),
	),
);
