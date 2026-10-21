import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
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

interface CoursePageBody {
	items: CourseListItem[];
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

const coursePage = Question.about('the course page', async (currentActor) => currentActor.answer(LastResponse.body<CoursePageBody>()));

const courseField = (field: 'page' | 'pageSize' | 'totalItems' | 'totalPages') =>
	Question.about(`the course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(coursePage);
		return body[field];
	});

const courseTitles = Question.about('the course titles', async (currentActor) => {
	const body = await currentActor.answer(coursePage);
	return body.items.map((item) => item.title).join(' | ');
});

const courseItemCount = Question.about('the course item count', async (currentActor) => {
	const body = await currentActor.answer(coursePage);
	return body.items.length;
});

const courseError = Question.about('the course error', async (currentActor) => currentActor.answer(LastResponse.body<CourseErrorBody>()));

When('the client requests the course catalog at {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the course catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseField('page')), equals(page))));

Then('the course page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseField('pageSize')), equals(pageSize))));

Then('the course total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalItems')), equals(totalItems))));

Then('the course total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalPages')), equals(totalPages))));

Then('the course item count is {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(courseItemCount), equals(count))));

Then('the course titles are {string}', (expected: string) => actor().attemptsTo(Ensure.that(resolved(courseTitles), equals(expected))));

Then('every course modality is {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('course modalities', async (currentActor) => {
					const body = await currentActor.answer(coursePage);
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
				Question.about('course statuses', async (currentActor) => {
					const body = await currentActor.answer(coursePage);
					return body.items.every((item) => item.status === status);
				}),
			),
			equals(true),
		),
	),
);

Then(
	'the only course is {string} titled {string} with modality {string} and status {string} and tags {string} and summary {string} and created at {string} and updated at {string}',
	(id: string, title: string, modality: string, status: string, tags: string, summary: string, createdAt: string, updatedAt: string) =>
		actor().attemptsTo(
			Ensure.that(
				resolved(
					Question.about('the only course', async (currentActor) => {
						const body = await currentActor.answer(coursePage);
						const item = body.items[0];
						if (item === undefined || body.items.length !== 1) {
							return '';
						}
						return [item.id, item.title, item.modality, item.status, item.tags.join(','), item.summary, item.createdAt, item.updatedAt].join(' | ');
					}),
				),
				equals([id, title, modality, status, tags, summary, createdAt, updatedAt].join(' | ')),
			),
		),
);

Then('the course catalog error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course error code', async (currentActor) => {
					const body = await currentActor.answer(courseError);
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
					const body = await currentActor.answer(courseError);
					return body.error.message;
				}),
			),
			equals(message),
		),
	),
);

Then('the course catalog error fields are {string}', (fields: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course error fields', async (currentActor) => {
					const body = await currentActor.answer(courseError);
					return body.error.details.map((detail) => detail.field).join(' | ');
				}),
			),
			equals(fields),
		),
	),
);

Then('the course catalog error detail for {string} is {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`the course error detail for ${field}`, async (currentActor) => {
					const body = await currentActor.answer(courseError);
					return body.error.details.find((detail) => detail.field === field)?.message ?? '';
				}),
			),
			equals(message),
		),
	),
);
