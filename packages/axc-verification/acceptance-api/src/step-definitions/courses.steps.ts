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

interface CourseErrorBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const coursePage = Question.about('the course catalog page', (currentActor) => currentActor.answer(LastResponse.body<CoursePage>()));

const pageField = <K extends keyof CoursePage>(field: K) =>
	Question.about(`the course catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage);
		return body[field];
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests the course catalog with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(pageField('page')), equals(page))));

Then('the course catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(pageField('pageSize')), equals(pageSize))));

Then('the course catalog contains at least {int} courses', (minimum: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the catalog has enough courses', async (currentActor) => {
					const body = await currentActor.answer(coursePage);
					return body.totalItems >= minimum;
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog returns {int} courses', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the returned course count', async (currentActor) => {
					const body = await currentActor.answer(coursePage);
					return body.items.length;
				}),
			),
			equals(count),
		),
	),
);

Then('the courses are sorted by title', () => actor().attemptsTo(Ensure.that(resolved(sortedBy('title')), equals(true))));

Then('the courses are sorted by createdAt', () => actor().attemptsTo(Ensure.that(resolved(sortedBy('createdAt')), equals(true))));

Then('every course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`every course matches ${keyword}`, async (currentActor) => {
					const body = await currentActor.answer(coursePage);
					const needle = keyword.toLocaleLowerCase('en');
					return (
						body.items.length > 0 &&
						body.items.every((course) => course.title.toLocaleLowerCase('en').includes(needle) || course.summary.toLocaleLowerCase('en').includes(needle) || course.tags.some((tag) => tag.toLocaleLowerCase('en').includes(needle)))
					);
				}),
			),
			equals(true),
		),
	),
);

Then('every course has modality {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse((course) => course.modality === modality)), equals(true))));

Then('every course has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse((course) => course.status === status)), equals(true))));

Then('every course has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				everyCourse((course) => {
					const needle = tag.toLocaleLowerCase('en');
					return course.tags.some((candidate) => candidate.toLocaleLowerCase('en') === needle);
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog includes {string}', (title: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`the catalog includes ${title}`, async (currentActor) => {
					const body = await currentActor.answer(coursePage);
					return body.items.some((course) => course.title === title);
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog returns the AI Security Foundations contract', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the sample course contract', async (currentActor) => {
					const body = await currentActor.answer(coursePage);
					return JSON.stringify(body);
				}),
			),
			equals(
				JSON.stringify({
					items: [
						{
							id: 'course-001',
							title: 'AI Security Foundations',
							summary: 'Introductory course on secure AI-assisted development.',
							modality: 'online',
							status: 'active',
							tags: ['ai', 'security'],
							createdAt: '2026-01-15T00:00:00.000Z',
							updatedAt: '2026-06-01T00:00:00.000Z',
						},
					],
					page: 1,
					pageSize: 5,
					totalItems: 1,
					totalPages: 1,
				}),
			),
		),
	),
);

Then('the course catalog pagination metadata is consistent', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('consistent pagination metadata', async (currentActor) => {
					const body = await currentActor.answer(coursePage);
					const expectedPages = body.totalItems === 0 ? 0 : Math.ceil(body.totalItems / body.pageSize);
					return body.items.length <= body.pageSize && body.totalPages === expectedPages && body.totalItems >= body.items.length;
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
					const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the course catalog error message is {string}', (message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course error message', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
					return body.error.message;
				}),
			),
			equals(message),
		),
	),
);

Then('the course catalog error details include field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`error details include ${field}`, async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
					return body.error.details.some((detail) => detail.field === field);
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog error details include field {string} and message {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`error details include ${field}`, async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
					return body.error.details.some((detail) => detail.field === field && detail.message === message);
				}),
			),
			equals(true),
		),
	),
);

Then('the course catalog returns no courses', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the empty catalog page', async (currentActor) => {
					const body = await currentActor.answer(coursePage);
					return body.items.length === 0 && body.totalItems === 0 && body.totalPages === 0 && body.page === 1 && body.pageSize === 10;
				}),
			),
			equals(true),
		),
	),
);

function everyCourse(predicate: (course: CourseItem) => boolean) {
	return Question.about('every returned course matches', async (currentActor) => {
		const body = await currentActor.answer(coursePage);
		return body.items.length > 0 && body.items.every(predicate);
	});
}

function sortedBy(field: 'title' | 'createdAt') {
	return Question.about(`courses sorted by ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage);
		const values = body.items.map((course) => course[field]);
		for (let index = 1; index < values.length; index += 1) {
			const previous = values[index - 1];
			const current = values[index];
			if (previous === undefined || current === undefined || previous.localeCompare(current, 'en', { numeric: true, sensitivity: 'base' }) > 0) {
				return false;
			}
		}
		return values.length > 1;
	});
}
