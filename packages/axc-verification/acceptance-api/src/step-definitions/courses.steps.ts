import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseItem {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
	[field: string]: unknown;
}

interface CourseSearchBody {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorBody {
	error: { code: string; message: string; details: { field: string; message: string }[] };
}

const actor = () => actorCalled('API client');

const about = <T>(description: string, extract: (body: CourseSearchBody) => T) => Question.about(description, async (currentActor) => extract(await currentActor.answer(LastResponse.body<CourseSearchBody>())));

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the catalog returns {int} items', (count: number) => actor().attemptsTo(Ensure.that(resolved(about('the item count', (body) => body.items.length)), equals(count))));

Then('the catalog page is page {int}, pageSize {int}, totalItems {int}, totalPages {int}', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(Ensure.that(resolved(about('the pagination metadata', (body) => [body.page, body.pageSize, body.totalItems, body.totalPages].join('/'))), equals([page, pageSize, totalItems, totalPages].join('/')))),
);

Then('the catalog item ids are {string}', (ids: string) => actor().attemptsTo(Ensure.that(resolved(about('the item ids', (body) => body.items.map((item) => item.id).join(','))), equals(ids))));

Then('every catalog item has {string} equal to {string}', (field: string, value: string) =>
	actor().attemptsTo(Ensure.that(resolved(about(`every item ${field}`, (body) => body.items.length > 0 && body.items.every((item) => item[field] === value))), isTrue())),
);

Then('every catalog item carries the tag {string}', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(about(`every item tagged ${tag}`, (body) => body.items.length > 0 && body.items.every((item) => item.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase())))), isTrue())),
);

Then('the catalog items ascend by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				about(`items ascending by ${field}`, (body) => {
					const values = body.items.map((item) => String(item[field]));
					return values.join('|') === [...values].sort().join('|');
				}),
			),
			isTrue(),
		),
	),
);

Then('the catalog body has the fields {string}', (fields: string) => actor().attemptsTo(Ensure.that(resolved(about('the body fields', (body) => Object.keys(body).sort().join(','))), equals(fields.split(',').sort().join(',')))));

Then('every catalog item has the fields {string}', (fields: string) =>
	actor().attemptsTo(Ensure.that(resolved(about('the item fields', (body) => body.items.every((item) => Object.keys(item).sort().join(',') === fields.split(',').sort().join(',')))), isTrue())),
);

Then('the catalog error code is {string} for field {string}', (code: string, field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the error envelope', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
					return [body.error.code, body.error.message, body.error.details.map((detail) => detail.field).join(',')].join('|');
				}),
			),
			equals([code, 'One or more query parameters are invalid.', field].join('|')),
		),
	),
);
