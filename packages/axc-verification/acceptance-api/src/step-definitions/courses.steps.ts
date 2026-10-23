import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { Question } from '@serenity-js/core';
import { GetRequest, Send } from '@serenity-js/rest';
import { actor, coursePage, resolved } from './http.ts';

When('the client searches courses', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client searches courses with query {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course page is page {int} of size {int} with {int} total items and {int} total pages', (page: number, pageSize: number, totalItems: number, totalPages: number) =>
	actor().attemptsTo(
		Ensure.that(resolved(pageField('page')), equals(page)),
		Ensure.that(resolved(pageField('pageSize')), equals(pageSize)),
		Ensure.that(resolved(pageField('totalItems')), equals(totalItems)),
		Ensure.that(resolved(pageField('totalPages')), equals(totalPages)),
	),
);

Then('the course page has {int} items', (count: number) => actor().attemptsTo(Ensure.that(resolved(itemCount()), equals(count))));

Then('the first course id is {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseId()), equals(id))));

Then('the course ids are {string}', (ids: string) => actor().attemptsTo(Ensure.that(resolved(courseIds()), equals(ids.split(',')))));

Then('the course ids include {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(includesCourse(id)), equals(true))));

Then('the course ids exclude {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(includesCourse(id)), equals(false))));

Then('every course modality is {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse((course) => course.modality === modality)), equals(true))));

Then('every course status is {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse((course) => course.status === status)), equals(true))));

Then('every course tag list contains {string}', (tag: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse((course) => course.tags.some((item) => item.toLowerCase() === tag.toLowerCase()))), equals(true))));

Then('every course matches the keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				everyCourse((course) => {
					const needle = keyword.toLowerCase();
					return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
				}),
			),
			equals(true),
		),
	),
);

Then('the courses are sorted by createdAt', () => actor().attemptsTo(Ensure.that(resolved(createdAtIsSorted()), equals(true))));

const pageField = (field: 'page' | 'pageSize' | 'totalItems' | 'totalPages') =>
	Question.about(`the course ${field}`, async (current) => {
		const body = await current.answer(coursePage());
		return body[field];
	});

const itemCount = () =>
	Question.about('the course item count', async (current) => {
		const body = await current.answer(coursePage());
		return body.items.length;
	});

const firstCourseId = () =>
	Question.about('the first course id', async (current) => {
		const body = await current.answer(coursePage());
		return body.items[0]?.id ?? '';
	});

const courseIds = () =>
	Question.about('the course ids', async (current) => {
		const body = await current.answer(coursePage());
		return body.items.map((course) => course.id);
	});

const includesCourse = (id: string) =>
	Question.about(`whether course ${id} is present`, async (current) => {
		const body = await current.answer(coursePage());
		return body.items.some((course) => course.id === id);
	});

const everyCourse = (predicate: (course: { modality: string; status: string; tags: string[]; title: string; summary: string }) => boolean) =>
	Question.about('whether every course matches', async (current) => {
		const body = await current.answer(coursePage());
		return body.items.length > 0 && body.items.every(predicate);
	});

const createdAtIsSorted = () =>
	Question.about('whether courses are sorted by createdAt', async (current) => {
		const body = await current.answer(coursePage());
		const stamps = body.items.map((course) => course.createdAt);
		return stamps.every((stamp, index) => index === 0 || stamp >= (stamps[index - 1] ?? stamp));
	});
