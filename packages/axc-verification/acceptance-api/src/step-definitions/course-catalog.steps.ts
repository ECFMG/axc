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

interface InvalidQueryBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const coursePage = <T>(description: string, project: (page: CoursePage) => T): Answerable<T> =>
	resolved(
		Question.about(description, async (currentActor) => {
			const body = await currentActor.answer(LastResponse.body<CoursePage>());
			return project(body);
		}),
	);

const errorBody = <T>(description: string, project: (body: InvalidQueryBody) => T): Answerable<T> =>
	resolved(
		Question.about(description, async (currentActor) => {
			const body = await currentActor.answer(LastResponse.body<InvalidQueryBody>());
			return project(body);
		}),
	);

const splitList = (value: string): string[] =>
	value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);

const sortKey = (course: CourseResource, field: string): string => (field === 'title' ? course.title.toLowerCase() : field === 'updatedAt' ? course.updatedAt : course.createdAt);

const isOrderedAscending = (items: CourseResource[], field: string): boolean => {
	const keys = items.map((course) => sortKey(course, field));
	return keys.every((key, index) => index === 0 || (keys[index - 1] ?? '').localeCompare(key) <= 0);
};

When('the client searches the course catalog with {string}', (query: string) => {
	const path = query.length === 0 ? '/api/courses' : `/api/courses?${query}`;
	return actor().attemptsTo(Send.a(GetRequest.to(path)));
});

Then('the catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the catalog returns {int} items', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			coursePage('the number of returned courses', (page) => page.items.length),
			equals(count),
		),
	),
);

Then('the catalog reports page {int} with page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(
		Ensure.that(
			coursePage('the reported pagination', (body) => `${body.page}/${body.pageSize}`),
			equals(`${page}/${pageSize}`),
		),
	),
);

Then('the catalog reports {int} total items and {int} total pages', (totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(
			coursePage('the reported totals', (body) => `${body.totalItems}/${body.totalPages}`),
			equals(`${totalItems}/${totalPages}`),
		),
	),
);

Then('the catalog items are ordered ascending by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			coursePage(`whether the courses are ordered ascending by ${field}`, (body) => isOrderedAscending(body.items, field)),
			equals(true),
		),
	),
);

Then('the catalog includes the courses {string}', (ids: string) =>
	actor().attemptsTo(
		Ensure.that(
			coursePage(`whether ${ids} are present`, (body) => {
				const returned = new Set(body.items.map((course) => course.id));
				return splitList(ids)
					.filter((id) => returned.has(id))
					.join(', ');
			}),
			equals(splitList(ids).join(', ')),
		),
	),
);

Then('the catalog returns exactly the courses {string}', (ids: string) =>
	actor().attemptsTo(
		Ensure.that(
			coursePage(`the returned course ids`, (body) => body.items.map((course) => course.id).join(', ')),
			equals(splitList(ids).join(', ')),
		),
	),
);

Then('every returned course has {string} equal to {string}', (field: string, value: string) =>
	actor().attemptsTo(
		Ensure.that(
			coursePage(`the distinct ${field} values`, (body) => {
				const distinct = new Set(body.items.map((course) => (field === 'status' ? course.status : course.modality)));
				return body.items.length > 0 && distinct.size === 1 && distinct.has(value);
			}),
			equals(true),
		),
	),
);

Then('every returned course carries the tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			coursePage(`whether every course is tagged ${tag}`, (body) => body.items.length > 0 && body.items.every((course) => course.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase()))),
			equals(true),
		),
	),
);

Then('the catalog reports the invalid query parameters {string}', (fields: string) =>
	actor().attemptsTo(
		Ensure.that(
			errorBody('the error code', (body) => body.error.code),
			equals('INVALID_QUERY_PARAMETER'),
		),
		Ensure.that(
			errorBody('the error message', (body) => body.error.message),
			equals('One or more query parameters are invalid.'),
		),
		Ensure.that(
			errorBody('the rejected fields', (body) => body.error.details.map((detail) => detail.field).join(', ')),
			equals(splitList(fields).join(', ')),
		),
		Ensure.that(
			errorBody('whether every rejected field explains itself', (body) => body.error.details.length > 0 && body.error.details.every((detail) => detail.message.length > 0)),
			equals(true),
		),
	),
);
