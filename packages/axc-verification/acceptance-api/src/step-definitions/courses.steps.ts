import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

interface CoursePage {
	items?: readonly { id?: string }[];
	page?: number;
	pageSize?: number;
	totalItems?: number;
}

const pageField = <K extends 'page' | 'pageSize' | 'totalItems'>(field: K) =>
	Question.about(`the course ${field}`, async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CoursePage>());
		return body[field] ?? -1;
	});

const courseCount = () =>
	Question.about('the course count', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CoursePage>());
		return body.items?.length ?? -1;
	});

const firstCourseId = () =>
	Question.about('the first course id', async (currentActor) => {
		const body = await currentActor.answer(LastResponse.body<CoursePage>());
		return body.items?.[0]?.id ?? '';
	});

When('the client searches courses at {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the course search responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page number is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(pageField('page')), equals(page))));

Then('the course page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(pageField('pageSize')), equals(pageSize))));

Then('the course page reports {int} total items', (totalItems: number) => actor().attemptsTo(Ensure.that(resolved(pageField('totalItems')), equals(totalItems))));

Then('the course page contains {int} courses', (count: number) => actor().attemptsTo(Ensure.that(resolved(courseCount()), equals(count))));

Then('the first course id is {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseId()), equals(id))));
