import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan, isLessThan, not } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

// QuestionAdapter is typed as Question<Promise<T>>. The actor resolves it to T.
const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CatalogCourse {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CatalogPage {
	items: CatalogCourse[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CatalogError {
	error: { code: string; message: string; details: Array<{ field: string; message: string }> };
}

const actor = () => actorCalled('API client');

const catalogPage = <K extends keyof CatalogPage>(field: K) =>
	Question.about(`the catalog ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CatalogPage>());
		return body[field];
	});

const itemCount = Question.about('the number of returned courses', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CatalogPage>());
	return body.items.length;
});

const distinctValues = (field: 'modality' | 'status') =>
	Question.about(`the distinct ${field} values`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CatalogPage>());
		return [...new Set(body.items.map((course) => course[field]))].join(',');
	});

const everyCourseTagged = (tag: string) =>
	Question.about(`whether every course is tagged ${tag}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CatalogPage>());
		return body.items.length > 0 && body.items.every((course) => course.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase()));
	});

const createdAtIsAscending = Question.about('whether the courses are ordered by createdAt', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CatalogPage>());
	const createdAt = body.items.map((course) => course.createdAt);
	return createdAt.every((value, index) => index === 0 || (createdAt[index - 1] ?? '') <= value);
});

const errorFields = Question.about('the rejected query parameter fields', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CatalogError>());
	return body.error.details.map((detail) => detail.field).join(',');
});

const errorCode = Question.about('the error code', async (currentActor) => {
	const body = await currentActor.answer(LastResponse.body<CatalogError>());
	return body.error.code;
});

When('the client requests the course catalog with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query}`))));

Then('the catalog responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the catalog page is {int} with page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(Ensure.that(resolved(catalogPage('page')), equals(page)), Ensure.that(resolved(catalogPage('pageSize')), equals(pageSize))),
);

Then('the catalog returns at most {int} items', (maximum: number) => actor().attemptsTo(Ensure.that(resolved(itemCount), not(isGreaterThan(maximum)))));

Then('the catalog reports at least {int} total items', (minimum: number) => actor().attemptsTo(Ensure.that(resolved(catalogPage('totalItems')), not(isLessThan(minimum)))));

Then('the catalog returns {int} total items', (total: number) => actor().attemptsTo(Ensure.that(resolved(catalogPage('totalItems')), equals(total)), Ensure.that(resolved(itemCount), equals(total))));

Then('every returned course has modality {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(distinctValues('modality')), equals(modality))));

Then('every returned course has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(distinctValues('status')), equals(status))));

Then('every returned course is tagged {string}', (tag: string) => actor().attemptsTo(Ensure.that(resolved(everyCourseTagged(tag)), equals(true))));

Then('the returned courses are ordered by createdAt', () => actor().attemptsTo(Ensure.that(resolved(createdAtIsAscending), equals(true))));

Then('the catalog error names the field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorCode), equals('INVALID_QUERY_PARAMETER')), Ensure.that(resolved(errorFields), equals(field))));
