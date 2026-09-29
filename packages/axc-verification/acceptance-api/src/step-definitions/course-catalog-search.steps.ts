import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseResource {
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
	items: CourseResource[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const COURSE_FIELDS = ['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'] as const;

const actor = () => actorCalled('API client');

const catalogPage = <T>(description: string, map: (page: CoursePage) => T): Answerable<T> => resolved(Question.about(description, async (currentActor) => map(await currentActor.answer(LastResponse.body<CoursePage>()))));

const catalogError = <T>(description: string, map: (body: CourseErrorBody) => T): Answerable<T> =>
	resolved(Question.about(description, async (currentActor) => map(await currentActor.answer(LastResponse.body<CourseErrorBody>()))));

const splitList = (value: string): string[] => (value.trim().length === 0 ? [] : value.split(',').map((entry) => entry.trim()));

const isAscending = (values: string[]): boolean => values.every((value, index) => index === 0 || (values[index - 1] ?? '') <= value);

When('the client searches the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(query.length === 0 ? '/api/courses' : `/api/courses?${query}`))));

Then('the catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the catalog page reports page {int}, page size {int}, {int} total items, and {int} total pages', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage('the catalog pagination metadata', (body) => [body.page, body.pageSize, body.totalItems, body.totalPages]),
			equals([page, pageSize, totalItems, totalPages]),
		),
	),
);

Then('the catalog returns the course ids {string}', (ids: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage('the returned course ids', (body) => body.items.map((course) => course.id)),
			equals(splitList(ids)),
		),
	),
);

Then('the catalog returns the course ids starting with {string}', (ids: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage('the leading course ids', (body) => body.items.slice(0, splitList(ids).length).map((course) => course.id)),
			equals(splitList(ids)),
		),
	),
);

Then('the catalog returns no courses', () =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage('the returned course count', (body) => body.items.length),
			equals(0),
		),
	),
);

Then('every returned course has modality {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage('the distinct modalities returned', (body) => [...new Set(body.items.map((course) => course.modality))]),
			equals([modality]),
		),
	),
);

Then('every returned course has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage('the distinct statuses returned', (body) => [...new Set(body.items.map((course) => course.status))]),
			equals([status]),
		),
	),
);

Then('every returned course has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage('courses missing the requested tag', (body) => body.items.filter((course) => !course.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase())).map((course) => course.id)),
			equals<string[]>([]),
		),
	),
);

Then('every returned course carries the full course contract', () =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage('course fields missing from the response', (body) => body.items.flatMap((course) => COURSE_FIELDS.filter((field) => course[field] === undefined).map((field) => `${course.id}.${field}`))),
			equals<string[]>([]),
		),
	),
);

Then('the catalog page is sorted by {string} ascending', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalogPage(`whether the page is ordered by ${field}`, (body) => isAscending(body.items.map((course) => (field === 'createdAt' ? course.createdAt : course.updatedAt)))),
			equals(true),
		),
	),
);

Then('the catalog error reports the invalid fields {string}', (fields: string) =>
	actor().attemptsTo(
		Ensure.that(
			catalogError('the error code and rejected fields', (body) => [body.error.code, body.error.message, ...body.error.details.map((detail) => detail.field)]),
			equals(['INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', ...splitList(fields)]),
		),
	),
);
