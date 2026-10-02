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

interface CourseList {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorBody {
	error: { code: string; message: string; details: { field: string; message: string }[] };
}

const DOCUMENTED_FIELDS = ['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'] as const;

const actor = () => actorCalled('API client');

const aboutList = <T>(description: string, read: (body: CourseList) => T) =>
	Question.about(description, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseList>());
		return read(body);
	});

const aboutError = <T>(description: string, read: (body: CourseErrorBody) => T) =>
	Question.about(description, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CourseErrorBody>());
		return read(body);
	});

const searchableText = (course: CourseItem) => `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase();

When('the client sends a GET request to {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the response has {int} items', (count: number) => actor().attemptsTo(Ensure.that(resolved(aboutList('the item count', (body) => body.items.length)), equals(count))));

Then('the response pagination is page {int} pageSize {int} totalItems {int} totalPages {int}', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(aboutList('the page', (body) => body.page)), equals(page)),
		Ensure.that(resolved(aboutList('the page size', (body) => body.pageSize)), equals(pageSize)),
		Ensure.that(resolved(aboutList('the total items', (body) => body.totalItems)), equals(totalItems)),
		Ensure.that(resolved(aboutList('the total pages', (body) => body.totalPages)), equals(totalPages)),
	),
);

Then('every item has {word} {string}', (field: string, value: string) =>
	actor().attemptsTo(Ensure.that(resolved(aboutList(`the distinct ${field} values`, (body) => [...new Set(body.items.map((course) => (field === 'modality' ? course.modality : course.status)))])), equals([value]))),
);

Then('every item mentions {string}', (keyword: string) =>
	actor().attemptsTo(Ensure.that(resolved(aboutList(`items not mentioning ${keyword}`, (body) => body.items.filter((course) => !searchableText(course).includes(keyword.toLowerCase())).map((course) => course.id))), equals([]))),
);

Then('every item has the tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(aboutList(`items without the tag ${tag}`, (body) => body.items.filter((course) => !course.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase())).map((course) => course.id))), equals([])),
	),
);

Then('the response items include {string}', (title: string) => actor().attemptsTo(Ensure.that(resolved(aboutList(`whether ${title} is present`, (body) => body.items.some((course) => course.title === title))), equals(true))));

Then('the response items are sorted ascending by {word}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				aboutList(`whether items ascend by ${field}`, (body) => {
					const values = body.items.map((course) => (field === 'createdAt' ? course.createdAt : course.updatedAt));
					return values.every((value, index) => index === 0 || (values[index - 1] ?? '') <= value);
				}),
			),
			equals(true),
		),
	),
);

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(aboutError('the error code', (body) => body.error.code)), equals(code))));

Then('the error details name the field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(aboutError('the invalid fields', (body) => body.error.details.map((detail) => detail.field))), equals([field]))));

Then('every item carries every documented course field', () =>
	actor().attemptsTo(Ensure.that(resolved(aboutList('missing documented fields', (body) => body.items.flatMap((course) => DOCUMENTED_FIELDS.filter((field) => course[field] === undefined)))), equals([]))),
);
