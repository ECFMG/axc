import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface Course {
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
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
	error: { code: string; details: { field: string }[] };
}

const actor = () => actorCalled('API client');
const page = <T>(description: string, fn: (body: CoursePage) => T) => Question.about(description, async (a) => fn(await a.answer(LastResponse.body<CoursePage>())));
const error = <T>(description: string, fn: (body: ErrorBody) => T) => Question.about(description, async (a) => fn(await a.answer(LastResponse.body<ErrorBody>())));

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the page is {int} with pageSize {int} and at most {int} items', (p: number, size: number, max: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(page('page', (b) => b.page)), equals(p)),
		Ensure.that(resolved(page('pageSize', (b) => b.pageSize)), equals(size)),
		Ensure.that(resolved(page('item count within limit', (b) => b.items.length > 0 && b.items.length <= max && b.totalPages >= 1)), isTrue()),
	),
);

Then('every course mentions {string}', (word: string) =>
	actor().attemptsTo(Ensure.that(resolved(page(`every course mentions ${word}`, (b) => b.items.length > 0 && b.items.every((c) => [c.title, c.summary, ...c.tags].join(' ').toLowerCase().includes(word)))), isTrue())),
);

Then('every course has {string} equal to {string}', (field: 'modality' | 'status', value: string) =>
	actor().attemptsTo(Ensure.that(resolved(page(`every ${field} is ${value}`, (b) => b.items.length > 0 && b.items.every((c) => c[field] === value))), isTrue())),
);

Then('every course has the tag {string}', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(page(`every course tagged ${tag}`, (b) => b.items.length > 0 && b.items.every((c) => c.tags.some((t) => t.toLowerCase() === tag)))), isTrue())),
);

Then('the courses are sorted by {string}', (field: 'createdAt') =>
	actor().attemptsTo(Ensure.that(resolved(page(`sorted by ${field}`, (b) => b.items.every((c, i) => i === 0 || (b.items[i - 1] as Course)[field] <= c[field]))), isTrue())),
);

Then('the items are empty with totalItems {int}', (total: number) =>
	actor().attemptsTo(Ensure.that(resolved(page('item count', (b) => b.items.length)), equals(0)), Ensure.that(resolved(page('totalItems', (b) => b.totalItems)), equals(total))),
);

Then('the error reports field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(error('error fields', (b) => b.error.details.some((d) => d.field === field))), isTrue())));

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(error('error code', (b) => b.error.code)), equals(code))));
