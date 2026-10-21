import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface Course {
	id: string;
	title: string;
	modality: string;
	status: string;
	createdAt: string;
}

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

const coursePage = <T>(description: string, read: (body: CoursePage) => T) => Question.about(description, async (currentActor) => read(await currentActor.answer(LastResponse.body<CoursePage>())));

const errorBody = <T>(description: string, read: (body: ErrorBody) => T) => Question.about(description, async (currentActor) => read(await currentActor.answer(LastResponse.body<ErrorBody>())));

When('the client searches courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(query === '' ? '/api/courses' : `/api/courses?${query}`))));

Then('the courses response has status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the courses response contains {int} items', (count: number) => actor().attemptsTo(Ensure.that(resolved(coursePage('the number of courses', (body) => body.items.length)), equals(count))));

Then('the courses page metadata is page {int}, pageSize {int}, totalItems {int}, totalPages {int}', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(coursePage('the pagination metadata', (body) => ({ page: body.page, pageSize: body.pageSize, totalItems: body.totalItems, totalPages: body.totalPages }))),
			equals({ page, pageSize, totalItems, totalPages }),
		),
	),
);

Then('the course ids are {string}', (ids: string) => actor().attemptsTo(Ensure.that(resolved(coursePage('the course ids', (body) => body.items.map((course) => course.id).join(','))), equals(ids))));

Then('every course has {word} {string}', (field: string, value: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(coursePage('the number of courses', (body) => body.items.length > 0)), isTrue()),
		Ensure.that(resolved(coursePage(`whether every course has ${field} ${value}`, (body) => body.items.every((course) => course[field as keyof Course] === value))), isTrue()),
	),
);

Then('the courses are sorted by title', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(coursePage('whether courses are sorted by title', (body) => body.items.every((course, index, all) => index === 0 || (all[index - 1]?.title ?? '').localeCompare(course.title, 'en', { sensitivity: 'base' }) <= 0))),
			isTrue(),
		),
	),
);

Then('the courses are sorted by createdAt', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(coursePage('whether courses are sorted by createdAt', (body) => body.items.every((course, index, all) => index === 0 || Date.parse(all[index - 1]?.createdAt ?? '') <= Date.parse(course.createdAt)))),
			isTrue(),
		),
		Ensure.that(resolved(coursePage('the oldest course', (body) => body.items[0]?.id)), equals('course-005')),
	),
);

Then('the error response reports an invalid {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(errorBody('the error code', (body) => body.error.code)), equals('INVALID_QUERY_PARAMETER')),
		Ensure.that(resolved(errorBody('the error message', (body) => body.error.message)), equals('One or more query parameters are invalid.')),
		Ensure.that(resolved(errorBody('the invalid fields', (body) => body.error.details.map((detail) => detail.field).join(','))), equals(field)),
	),
);
