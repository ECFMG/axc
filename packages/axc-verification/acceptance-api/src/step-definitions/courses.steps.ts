import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

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

interface CourseListResponse {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorResponse {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const listBody = () =>
	Question.about('the course catalog body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseListResponse>());
	});

const errorBody = () =>
	Question.about('the course catalog error body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseErrorResponse>());
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('page', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.page;
				}),
			),
			equals(page),
		),
	),
);

Then('the course catalog page size is {int}', (pageSize: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('pageSize', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.pageSize;
				}),
			),
			equals(pageSize),
		),
	),
);

Then('the course catalog returns at most {int} items', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('item count is at most the requested size', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.items.length <= count;
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog returns at least {int} item', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('item count is at least the requested size', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.items.length >= count;
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog returns {int} items', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('item count', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.items.length;
				}),
			),
			equals(count),
		),
	),
);

Then('the course catalog total items is at least {int}', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('totalItems is at least the requested size', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.totalItems >= count;
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog total items is {int}', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('totalItems', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.totalItems;
				}),
			),
			equals(count),
		),
	),
);

Then('the course catalog includes pagination metadata', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('pagination metadata is present', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return Number.isInteger(body.page) && Number.isInteger(body.pageSize) && Number.isInteger(body.totalItems) && Number.isInteger(body.totalPages);
				}),
			),
			equals(true),
		),
		Ensure.that(
			resolved(
				Question.about('totalPages is present', async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.totalPages >= 0;
				}),
			),
			equals(true),
		),
	),
);

Then('every returned course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`every course matches ${keyword}`, async (currentActor) => {
					const body = await currentActor.answer(listBody());
					const needle = keyword.toLowerCase();
					return body.items.every((course) => `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase().includes(needle));
				}),
			),
			equals(true),
		),
	),
);

Then('every returned course has modality {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`every course has modality ${modality}`, async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.items.every((course) => course.modality === modality);
				}),
			),
			equals(true),
		),
	),
);

Then('every returned course has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`every course has status ${status}`, async (currentActor) => {
					const body = await currentActor.answer(listBody());
					return body.items.every((course) => course.status === status);
				}),
			),
			equals(true),
		),
	),
);

Then('every returned course has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`every course has tag ${tag}`, async (currentActor) => {
					const body = await currentActor.answer(listBody());
					const needle = tag.toLowerCase();
					return body.items.every((course) => course.tags.some((courseTag) => courseTag.toLowerCase() === needle));
				}),
			),
			equals(true),
		),
	),
);

Then('the returned courses are sorted by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`courses sorted by ${field}`, async (currentActor) => {
					const body = await currentActor.answer(listBody());
					const values = body.items.map((course) => {
						if (field === 'createdAt') {
							return course.createdAt;
						}
						if (field === 'updatedAt') {
							return course.updatedAt;
						}
						return course.title;
					});
					const sorted = [...values].sort((left, right) => left.localeCompare(right));
					return values.join('|') === sorted.join('|');
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('error code', async (currentActor) => {
					const body = await currentActor.answer(errorBody());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the course catalog error details include field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`error details include ${field}`, async (currentActor) => {
					const body = await currentActor.answer(errorBody());
					return body.error.details.some((detail) => detail.field === field);
				}),
			),
			equals(true),
		),
	),
);
