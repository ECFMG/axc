import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
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

interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ApiErrorResponse {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const coursePage = <T>(description: string, project: (page: CoursePage) => T) =>
	Question.about(description, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CoursePage>());
		return project(body);
	});

const errorFields = Question.about('the invalid query parameter fields', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<ApiErrorResponse>());
	return `${body.error.code}:${body.error.details.map((detail) => detail.field).join(',')}`;
});

const isSortedAscending = (values: string[]): boolean => values.every((value, index) => index === 0 || (values[index - 1] ?? '') <= value);

When('the client requests courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query}`))));

Then('the courses response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the courses response reports page {int} with page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage('the page metadata', (body) => `${body.page}/${body.pageSize}`)), equals(`${page}/${pageSize}`))),
);

Then('the courses response reports {int} total items across {int} pages', (totalItems: number, totalPages: number) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage('the totals', (body) => `${body.totalItems}/${body.totalPages}`)), equals(`${totalItems}/${totalPages}`))),
);

Then('the courses response contains at most {int} items', (maximum: number) => actor().attemptsTo(Ensure.that(resolved(coursePage('the item count is within the page size', (body) => body.items.length <= maximum)), isTrue())));

Then('the courses response is not empty', () => actor().attemptsTo(Ensure.that(resolved(coursePage('the page has items', (body) => body.items.length > 0)), isTrue())));

Then('the courses response contains exactly the course ids {string}', (expected: string) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage('the course ids', (body) => body.items.map((course) => course.id).join(','))), equals(expected))),
);

Then('the courses response is ordered by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				coursePage(`the ordering by ${field}`, (body) => {
					const values = body.items.map((course) => (field === 'title' ? course.title.toLowerCase() : field === 'createdAt' ? course.createdAt : course.updatedAt));
					return isSortedAscending(values);
				}),
			),
			isTrue(),
		),
	),
);

Then('every returned course matches the keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				coursePage(`every course matching ${keyword}`, (body) => {
					const needle = keyword.toLowerCase();
					return body.items.every((course) => course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle)));
				}),
			),
			isTrue(),
		),
	),
);

Then('every returned course has {string} equal to {string}', (field: string, value: string) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage(`every course ${field}`, (body) => body.items.every((course) => (field === 'modality' ? course.modality : course.status) === value))), isTrue())),
);

Then('every returned course carries the tag {string}', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage(`every course tagged ${tag}`, (body) => body.items.every((course) => course.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase())))), isTrue())),
);

Then('the courses error response reports {string} as invalid', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorFields), equals(`INVALID_QUERY_PARAMETER:${field}`))));
