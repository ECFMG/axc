import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

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
}

interface CoursePage {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseQueryErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

function pageValue<T>(description: string, read: (page: CoursePage) => T): Answerable<T> {
	return resolved(
		Question.about(description, async (currentActor) => {
			const body = await currentActor.answer(LastResponse.body<CoursePage>());
			return read(body);
		}),
	);
}

function errorValue<T>(description: string, read: (body: CourseQueryErrorBody) => T): Answerable<T> {
	return resolved(
		Question.about(description, async (currentActor) => {
			const body = await currentActor.answer(LastResponse.body<CourseQueryErrorBody>());
			return read(body);
		}),
	);
}

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('the course page', (body) => body.page),
			equals(page),
		),
	),
);

Then('the course catalog page size is {int}', (pageSize: number) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('the course page size', (body) => body.pageSize),
			equals(pageSize),
		),
	),
);

Then('the course catalog item count is {int}', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('the course item count', (body) => body.items.length),
			equals(count),
		),
	),
);

Then('the course catalog total items is {int}', (totalItems: number) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('the course total items', (body) => body.totalItems),
			equals(totalItems),
		),
	),
);

Then('the course catalog total pages is {int}', (totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('the course total pages', (body) => body.totalPages),
			equals(totalPages),
		),
	),
);

Then('the course catalog items are empty', () =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('the course item count', (body) => body.items.length),
			equals(0),
		),
	),
);

Then('the first course id is {string}', (id: string) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('the first course id', (body) => body.items[0]?.id ?? ''),
			equals(id),
		),
	),
);

Then('the course catalog item ids are {string}', (ids: string) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('the course ids', (body) => body.items.map((item) => item.id).join(',')),
			equals(ids),
		),
	),
);

Then('every course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('every course matches the keyword', (body) => {
				const needle = keyword.toLocaleLowerCase('en-US');
				return body.items.length > 0 && body.items.every((item) => `${item.title}\n${item.summary}\n${item.tags.join('\n')}`.toLocaleLowerCase('en-US').includes(needle));
			}),
			equals(true),
		),
	),
);

Then('every course modality is {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('every modality matches', (body) => body.items.length > 0 && body.items.every((item) => item.modality === modality)),
			equals(true),
		),
	),
);

Then('every course status is {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('every status matches', (body) => body.items.length > 0 && body.items.every((item) => item.status === status)),
			equals(true),
		),
	),
);

Then('courses are sorted by createdAt ascending', () =>
	actor().attemptsTo(
		Ensure.that(
			pageValue('createdAt is ascending', (body) => isSortedAscending(body.items.map((item) => item.createdAt))),
			equals(true),
		),
	),
);

Then('the course catalog error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			errorValue('the error code', (body) => body.error.code),
			equals(code),
		),
	),
);

Then('the course catalog error message is {string}', (message: string) =>
	actor().attemptsTo(
		Ensure.that(
			errorValue('the error message', (body) => body.error.message),
			equals(message),
		),
	),
);

Then('the course catalog error details include field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			errorValue('the error fields', (body) => body.error.details.some((detail) => detail.field === field)),
			equals(true),
		),
	),
);

Then('the course catalog error details include {string} for field {string}', (message: string, field: string) =>
	actor().attemptsTo(
		Ensure.that(
			errorValue('the matching error detail', (body) => body.error.details.some((detail) => detail.field === field && detail.message === message)),
			equals(true),
		),
	),
);

function isSortedAscending(values: readonly string[]): boolean {
	if (values.length < 2) {
		return false;
	}
	for (let index = 1; index < values.length; index += 1) {
		const previous = values[index - 1];
		const current = values[index];
		if (previous === undefined || current === undefined || previous > current) {
			return false;
		}
	}
	return true;
}
