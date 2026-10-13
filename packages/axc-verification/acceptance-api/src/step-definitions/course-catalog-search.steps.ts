import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

type Course = Record<string, string> & { id: string };

interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorBody {
	error: { code: string; message: string; details: { field: string; message: string }[] };
}

const actor = () => actorCalled('API client');

const page = <T>(description: string, pick: (body: CoursePage) => T): Answerable<T> => resolved<T>(Question.about(description, async (currentActor) => pick(await currentActor.answer(LastResponse.body<CoursePage>()))));

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the page metadata is page {int}, pageSize {int}, totalItems {int}, totalPages {int}', (p: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(
			page('the page metadata', ({ page, pageSize, totalItems, totalPages }) => ({ page, pageSize, totalItems, totalPages })),
			equals({ page: p, pageSize, totalItems, totalPages }),
		),
	),
);

Then('the response holds {int} items sorted by {string}', (count: number, field: string) =>
	actor().attemptsTo(
		Ensure.that(
			page('the item count', (b) => b.items.length),
			equals(count),
		),
		Ensure.that(
			page(`items sorted by ${field}`, (b) => b.items.every((c, i, all) => i === 0 || (all[i - 1]?.[field] ?? '').localeCompare(c[field] ?? '') <= 0)),
			isTrue(),
		),
	),
);

Then('the item ids are {string}', (ids: string) =>
	actor().attemptsTo(
		Ensure.that(
			page('the item ids', (b) => b.items.map((c) => c.id).join(',')),
			equals(ids),
		),
	),
);

Then('every item has {string} equal to {string}', (field: string, value: string) =>
	actor().attemptsTo(
		Ensure.that(
			page('the item count', (b) => b.items.length > 0),
			isTrue(),
		),
		Ensure.that(
			page(`every ${field}`, (b) => b.items.every((c) => c[field] === value)),
			isTrue(),
		),
	),
);

Then('the error names the invalid field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the error body', async (a) => {
					const { error } = await a.answer(LastResponse.body<ErrorBody>());
					return [error.code, error.message, error.details.map((d) => d.field).join(',')];
				}),
			),
			equals(['INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', field]),
		),
	),
);
