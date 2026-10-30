import { readFileSync } from 'node:fs';
import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isTrue } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseItem {
	id: string;
	modality: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	title: string;
}
interface CoursePage {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
}
interface ErrorBody {
	error: { code: string; details: { field: string }[] };
}

const actor = () => actorCalled('API client');
const body = <T, R>(description: string, pick: (b: T) => R) => Question.about(description, async (a) => pick(await a.answer(LastResponse.body<T>())));
const items = (description: string, pick: (i: CourseItem[]) => unknown) => body<CoursePage, unknown>(description, (b) => pick(b.items));

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the courses response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the page is {int} with pageSize {int} and {int} items of {int} total', (page: number, pageSize: number, count: number, total: number) =>
	actor().attemptsTo(Ensure.that(resolved(body<CoursePage, number[]>('pagination', (b) => [b.page, b.pageSize, b.items.length, b.totalItems])), equals([page, pageSize, count, total]))),
);

Then('the course ids are {string}', (ids: string) => actor().attemptsTo(Ensure.that(resolved(items('course ids', (i) => i.map((c) => c.id).sort())), equals(ids.split(',')))));

Then('every course has modality {string}', (modality: string) =>
	actor().attemptsTo(Ensure.that(resolved(items('modalities', (i) => i.length > 0 && i.every((c) => c.modality === modality)) as Question<Promise<boolean>>), isTrue())),
);

Then('every course has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(items('statuses', (i) => i.length > 0 && i.every((c) => c.status === status)) as Question<Promise<boolean>>), isTrue())));

Then('the courses are sorted by {string}', (field: 'createdAt' | 'updatedAt' | 'title') =>
	actor().attemptsTo(Ensure.that(resolved(items('sort order', (i) => i.map((c) => c[field]).every((v, n, all) => n === 0 || (all[n - 1] ?? '') <= v)) as Question<Promise<boolean>>), isTrue())),
);

Then('the error names field {string}', (field: string) =>
	actor().attemptsTo(Ensure.that(resolved(body<ErrorBody, string[]>('error', (b) => [b.error.code, b.error.details[0]?.field ?? ''])), equals(['INVALID_QUERY_PARAMETER', field]))),
);

Then('the courses documentation mentions {string}', (terms: string) => {
	const doc = readFileSync(new URL('../../../../../apps/docs/docs/courses.md', import.meta.url), 'utf8');
	for (const term of terms.split(',')) if (!doc.includes(term)) throw new Error(`courses.md is missing ${term}`);
});
