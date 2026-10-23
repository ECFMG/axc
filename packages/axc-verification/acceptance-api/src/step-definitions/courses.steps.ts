import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
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

interface CourseListResponse {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorResponse {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const courseBody = Question.about('the course catalog body', async (currentActor) => currentActor.answer(LastResponse.body<CourseListResponse>()));

const courseField = <K extends keyof CourseListResponse>(field: K) =>
	Question.about(`the courses ${field}`, async (currentActor) => {
		const body = await currentActor.answer(courseBody);
		return body[field];
	});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client requests courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the courses response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the courses page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(courseField('page')), equals(page))));

Then('the courses page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(courseField('pageSize')), equals(pageSize))));

Then('the courses total items is {int}', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalItems')), equals(totalItems))));

Then('the courses total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(courseField('totalPages')), equals(totalPages))));

Then('the courses page contains {int} items', (count: number) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course item count', async (currentActor) => {
					const body = await currentActor.answer(courseBody);
					return body.items.length;
				}),
			),
			equals(count),
		),
	),
);

Then('the course ids are {string}', (expected: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course ids', async (currentActor) => {
					const body = await currentActor.answer(courseBody);
					return body.items.map((item) => item.id).join(',');
				}),
			),
			equals(expected),
		),
	),
);

Then('every course has modality {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('course modalities', async (currentActor) => {
					const body = await currentActor.answer(courseBody);
					return body.items.length > 0 && body.items.every((item) => item.modality === modality);
				}),
			),
			equals(true),
		),
	),
);

Then('every course has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('course statuses', async (currentActor) => {
					const body = await currentActor.answer(courseBody);
					return body.items.length > 0 && body.items.every((item) => item.status === status);
				}),
			),
			equals(true),
		),
	),
);

Then('every course has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('course tags', async (currentActor) => {
					const body = await currentActor.answer(courseBody);
					const needle = tag.toLowerCase();
					return body.items.length > 0 && body.items.every((item) => item.tags.some((itemTag) => itemTag.toLowerCase() === needle));
				}),
			),
			equals(true),
		),
	),
);

Then('each course item matches the course contract', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course item contract', async (currentActor) => {
					const body = await currentActor.answer(courseBody);
					return body.items.length > 0 && body.items.every(matchesCourseContract);
				}),
			),
			equals(true),
		),
	),
);

Then('the course items are sorted by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`courses sorted by ${field}`, async (currentActor) => {
					const body = await currentActor.answer(courseBody);
					const values = body.items.map((item) => sortValue(item, field));
					return values.length > 1 && isNonDecreasing(values);
				}),
			),
			equals(true),
		),
	),
);

Then('the courses error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the courses error code', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseErrorResponse>());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the courses error message is {string}', (message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the courses error message', async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseErrorResponse>());
					return body.error.message;
				}),
			),
			equals(message),
		),
	),
);

Then('the courses error detail for {string} is {string}', (field: string, message: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about(`the ${field} error detail`, async (currentActor) => {
					const body = await currentActor.answer(LastResponse.body<CourseErrorResponse>());
					const detail = body.error.details.find((item) => item.field === field);
					return detail?.message ?? '';
				}),
			),
			equals(message),
		),
	),
);

function matchesCourseContract(item: CourseItem): boolean {
	return item.id.length > 0 && item.title.length > 0 && item.summary.length > 0 && isModality(item.modality) && isStatus(item.status) && Array.isArray(item.tags) && isIsoTimestamp(item.createdAt) && isIsoTimestamp(item.updatedAt);
}

function isModality(value: string): boolean {
	return value === 'online' || value === 'in-person' || value === 'hybrid';
}

function isStatus(value: string): boolean {
	return value === 'draft' || value === 'active' || value === 'retired';
}

function isIsoTimestamp(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function sortValue(item: CourseItem, field: string): string {
	if (field === 'title') {
		return item.title;
	}
	if (field === 'createdAt') {
		return item.createdAt;
	}
	if (field === 'updatedAt') {
		return item.updatedAt;
	}
	return '';
}

function isNonDecreasing(values: readonly string[]): boolean {
	for (let index = 1; index < values.length; index += 1) {
		const previous = values[index - 1];
		const current = values[index];
		if (previous === undefined || current === undefined || previous.toLowerCase() > current.toLowerCase()) {
			return false;
		}
	}
	return true;
}
