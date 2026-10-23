import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan, isLessThan } from '@serenity-js/assertions';
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

interface CourseListResponse {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorResponse {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course list page is {int}', (page: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('page', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.page;
				}),
			),
			equals(page),
		),
	),
);

Then('the course list page size is {int}', (pageSize: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('pageSize', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.pageSize;
				}),
			),
			equals(pageSize),
		),
	),
);

Then('the course list has at most {int} items', (limit: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('item count', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.items.length;
				}),
			),
			isLessThan(limit + 1),
		),
	),
);

Then('the course list total items is at least {int}', (minimum: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('totalItems', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.totalItems;
				}),
			),
			isGreaterThan(minimum - 1),
		),
	),
);

Then('the course list total items is {int}', (totalItems: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('totalItems', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.totalItems;
				}),
			),
			equals(totalItems),
		),
	),
);

Then('the course list total pages is consistent', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('pagination consistency', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.totalPages === Math.ceil(body.totalItems / body.pageSize) && body.items.length <= body.pageSize;
				}),
			),
			equals(true),
		),
	),
);

Then('every course item has the catalog fields', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('catalog fields', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.items.every(
						(item: CourseItem) =>
							typeof item.id === 'string' &&
							typeof item.title === 'string' &&
							typeof item.summary === 'string' &&
							typeof item.modality === 'string' &&
							typeof item.status === 'string' &&
							Array.isArray(item.tags) &&
							typeof item.createdAt === 'string' &&
							typeof item.updatedAt === 'string',
					);
				}),
			),
			equals(true),
		),
	),
);

Then('every course item matches the keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('keyword matches', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					const needle = keyword.toLocaleLowerCase();
					return body.items.every((item: CourseItem) => `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(needle));
				}),
			),
			equals(true),
		),
	),
);

Then('every course item has modality {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('modality', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.items.length > 0 && body.items.every((item: CourseItem) => item.modality === modality);
				}),
			),
			equals(true),
		),
	),
);

Then('every course item has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('status', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.items.length > 0 && body.items.every((item: CourseItem) => item.status === status);
				}),
			),
			equals(true),
		),
	),
);

Then('every course item has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('tag', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					const needle = tag.toLocaleLowerCase();
					return body.items.length > 0 && body.items.every((item: CourseItem) => item.tags.some((value: string) => value.toLocaleLowerCase() === needle));
				}),
			),
			equals(true),
		),
	),
);

Then('the course items are sorted by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('sort order', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					const values = body.items.map((item: CourseItem) => item[field as keyof CourseItem]);
					const serialized = values.map((value: string | string[]) => String(value));
					const sorted = [...serialized].sort((left, right) => left.localeCompare(right));
					return serialized.join('|') === sorted.join('|');
				}),
			),
			equals(true),
		),
	),
);

Then('the course list is empty', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('empty items', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseListResponse>());
					return body.items.length;
				}),
			),
			equals(0),
		),
	),
);

Then('the error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('error code', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<ErrorResponse>());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the error details include fields {string}', (fields: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('error fields', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<ErrorResponse>());
					return body.error.details.map((detail: { field: string; message: string }) => detail.field).join(',');
				}),
			),
			equals(fields),
		),
	),
);
