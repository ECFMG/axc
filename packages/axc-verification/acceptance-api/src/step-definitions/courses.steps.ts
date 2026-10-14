import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
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

interface CourseListBody {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface QueryErrorBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

const actor = () => actorCalled('API client');

const courseList = () =>
	Question.about('the course list body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<CourseListBody>());
	});

const queryError = () =>
	Question.about('the query error body', async (currentActor) => {
		return await currentActor.answer(LastResponse.body<QueryErrorBody>());
	});

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course list uses default pagination', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('default pagination', async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return body.page === 1 && body.pageSize === 10 && body.items.length <= 10 && body.totalItems >= 12 && body.totalPages >= 2;
				}),
			),
			isTrue(),
		),
	),
);

Then('each course item has the required catalog fields', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('required course fields', async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return (
						body.items.length > 0 &&
						body.items.every(
							(item) =>
								typeof item.id === 'string' &&
								typeof item.title === 'string' &&
								typeof item.summary === 'string' &&
								typeof item.modality === 'string' &&
								typeof item.status === 'string' &&
								Array.isArray(item.tags) &&
								typeof item.createdAt === 'string' &&
								typeof item.updatedAt === 'string',
						)
					);
				}),
			),
			isTrue(),
		),
	),
);

Then('the course list is not empty', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('non-empty course list', async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return body.items.length > 0;
				}),
			),
			isTrue(),
		),
	),
);

Then('every returned course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`courses matching ${keyword}`, async (currentActor) => {
					const body = await currentActor.answer(courseList());
					const needle = keyword.toLowerCase();
					return body.items.every((item) => item.title.toLowerCase().includes(needle) || item.summary.toLowerCase().includes(needle) || item.tags.some((tag) => tag.toLowerCase().includes(needle)));
				}),
			),
			isTrue(),
		),
	),
);

Then('every returned course has modality {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`courses with modality ${modality}`, async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return body.items.every((item) => item.modality === modality);
				}),
			),
			isTrue(),
		),
	),
);

Then('every returned course has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`courses with status ${status}`, async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return body.items.every((item) => item.status === status);
				}),
			),
			isTrue(),
		),
	),
);

Then('every returned course has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`courses with tag ${tag}`, async (currentActor) => {
					const body = await currentActor.answer(courseList());
					const needle = tag.toLowerCase();
					return body.items.every((item) => item.tags.some((value) => value.toLowerCase() === needle));
				}),
			),
			isTrue(),
		),
	),
);

Then('the course list page is {int} with page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('requested pagination', async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return body.page === page && body.pageSize === pageSize && body.items.length <= pageSize;
				}),
			),
			isTrue(),
		),
	),
);

Then('the course list includes pagination metadata', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('pagination metadata', async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return typeof body.page === 'number' && typeof body.pageSize === 'number' && typeof body.totalItems === 'number' && typeof body.totalPages === 'number';
				}),
			),
			isTrue(),
		),
	),
);

Then('the course list is sorted by createdAt ascending', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('createdAt sort order', async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return body.items.every((item, index, items) => {
						const previous = items[index - 1];
						return index === 0 || (previous !== undefined && previous.createdAt <= item.createdAt);
					});
				}),
			),
			isTrue(),
		),
	),
);

Then('the error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('error code', async (currentActor) => {
					const body = await currentActor.answer(queryError());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the error details include field {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`error field ${field}`, async (currentActor) => {
					const body = await currentActor.answer(queryError());
					return body.error.details.some((detail) => detail.field === field);
				}),
			),
			isTrue(),
		),
	),
);

Then('the course list is empty with pagination metadata', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('empty course list', async (currentActor) => {
					const body = await currentActor.answer(courseList());
					return body.items.length === 0 && body.totalItems === 0 && typeof body.page === 'number' && typeof body.pageSize === 'number' && typeof body.totalPages === 'number';
				}),
			),
			isTrue(),
		),
	),
);
