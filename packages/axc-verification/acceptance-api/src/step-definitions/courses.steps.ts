import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseListItem {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CourseListPage {
	items: CourseListItem[];
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

const coursePage = () =>
	Question.about('the course catalog page', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseListPage>());
	});

const courseField = <K extends 'page' | 'pageSize' | 'totalItems' | 'totalPages'>(field: K) =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage());
		return body[field];
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseField('page')), equals(page))));

Then('the course catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseField('pageSize')), equals(pageSize))));

Then('the course catalog returns {int} courses', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course count', async (currentActor) => {
					const body = await currentActor.answer(coursePage());
					return body.items.length;
				}),
			),
			equals(count),
		),
	),
);

Then('the course catalog total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalItems')), equals(totalItems))));

Then('the course catalog total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalPages')), equals(totalPages))));

Then('every course modality is {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('matching modalities', async (currentActor) => {
					const body = await currentActor.answer(coursePage());
					return body.items.every((item) => item.modality === modality);
				}),
			),
			equals(true),
		),
	),
);

Then('every course status is {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('matching statuses', async (currentActor) => {
					const body = await currentActor.answer(coursePage());
					return body.items.every((item) => item.status === status);
				}),
			),
			equals(true),
		),
	),
);

Then('every course includes tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('matching tags', async (currentActor) => {
					const body = await currentActor.answer(coursePage());
					const expected = tag.toLocaleLowerCase();
					return body.items.every((item) => item.tags.some((candidate) => candidate.toLocaleLowerCase() === expected));
				}),
			),
			equals(true),
		),
	),
);

Then('every course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('matching keywords', async (currentActor) => {
					const body = await currentActor.answer(coursePage());
					const needle = keyword.toLocaleLowerCase();
					return body.items.every((item) => [item.title, item.summary, ...item.tags].some((field) => field.toLocaleLowerCase().includes(needle)));
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog includes course {string}', (id: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the included course', async (currentActor) => {
					const body = await currentActor.answer(coursePage());
					return body.items.some((item) => item.id === id);
				}),
			),
			equals(true),
		),
	),
);

Then('the courses are sorted by createdAt', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('createdAt sort order', async (currentActor) => {
					const body = await currentActor.answer(coursePage());
					const createdAt = body.items.map((item) => item.createdAt);
					const sorted = [...createdAt].sort((left, right) => left.localeCompare(right));
					return createdAt.every((value, index) => value === sorted[index]);
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
				Question.about('the course error code', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseQueryErrorBody>());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the course catalog error includes field {string} and message {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course error detail', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseQueryErrorBody>());
					return body.error.details.some((detail) => detail.field === field && detail.message === message);
				}),
			),
			equals(true),
		),
	),
);
