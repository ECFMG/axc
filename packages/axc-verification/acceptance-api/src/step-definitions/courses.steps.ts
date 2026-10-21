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

interface CoursePageBody {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const coursePage = <T>(description: string, read: (body: CoursePageBody) => T) =>
	Question.about(description, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CoursePageBody>());
		return read(body);
	});

const courseError = <T>(description: string, read: (body: CourseErrorBody) => T) =>
	Question.about(description, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
		return read(body);
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page metadata is page {int}, page size {int}, total items {int}, and total pages {int}', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(coursePage('course page', (body) => body.page)), equals(page)),
		Ensure.that(resolved(coursePage('course page size', (body) => body.pageSize)), equals(pageSize)),
		Ensure.that(resolved(coursePage('course total items', (body) => body.totalItems)), equals(totalItems)),
		Ensure.that(resolved(coursePage('course total pages', (body) => body.totalPages)), equals(totalPages)),
	),
);

Then('the course ids are {string}', (expected: string) => actor().attemptsTo(Ensure.that(resolved(coursePage('course ids', (body) => body.items.map((course) => course.id).join(','))), equals(expected))));

Then('every course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				coursePage('courses matching keyword', (body) => {
					const needle = keyword.toLowerCase();
					return body.items.every((course) => [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(needle)));
				}),
			),
			equals(true),
		),
	),
);

Then('every course modality is {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(coursePage('course modalities', (body) => body.items.every((course) => course.modality === modality))), equals(true))));

Then('every course status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(coursePage('course statuses', (body) => body.items.every((course) => course.status === status))), equals(true))));

Then('every course includes tag {string}', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage('course tags', (body) => body.items.every((course) => course.tags.some((item) => item.toLowerCase() === tag.toLowerCase())))), equals(true))),
);

Then('the first course json is', (docString: string) => {
	const expected = JSON.stringify(JSON.parse(docString) as CourseItem);
	return actor().attemptsTo(Ensure.that(resolved(coursePage('first course', (body) => JSON.stringify(body.items[0] ?? null))), equals(expected)));
});

Then('the course error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(courseError('course error code', (body) => body.error.code)), equals(code))));

Then('the course error message is {string}', (message: string) => actor().attemptsTo(Ensure.that(resolved(courseError('course error message', (body) => body.error.message)), equals(message))));

Then('the course error includes field {string} with message {string}', (field: string, message: string) =>
	actor().attemptsTo(Ensure.that(resolved(courseError('course error detail', (body) => body.error.details.some((detail) => detail.field === field && detail.message === message))), equals(true))),
);
