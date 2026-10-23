import { Then, When } from '@cucumber/cucumber';
import { containItemsWhereEachItem, Ensure, equals, isGreaterThan, property } from '@serenity-js/assertions';
import { actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { resolved, responseBody } from '../questions.ts';

interface Course {
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorBody {
	error: {
		code: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

const coursesMatchKeyword = (keyword: string) =>
	Question.about(`courses matching ${keyword}`, (current) =>
		current.answer(responseBody<CoursePage>()).then((page) => {
			const needle = keyword.toLowerCase();
			return page.items.length > 0 && page.items.every((course) => `${course.title}\n${course.summary}\n${course.tags.join('\n')}`.toLowerCase().includes(needle));
		}),
	);

const coursesHaveTag = (tag: string) =>
	Question.about(`courses tagged ${tag}`, (current) =>
		current.answer(responseBody<CoursePage>()).then((page) => page.items.length > 0 && page.items.every((course) => course.tags.some((item) => item.toLowerCase() === tag.toLowerCase()))),
	);

const coursesAreSortedBy = (field: 'createdAt' | 'title' | 'updatedAt') =>
	Question.about(`courses sorted by ${field}`, (current) =>
		current.answer(responseBody<CoursePage>()).then((page) => {
			if (page.items.length < 2) return false;
			for (let index = 1; index < page.items.length; index += 1) {
				const previous = page.items[index - 1];
				const item = page.items[index];
				if (previous === undefined || item === undefined || previous[field] > item[field]) return false;
			}
			return true;
		}),
	);

const coursePageMatches = (page: number, pageSize: number) =>
	Question.about('course page metadata', (current) =>
		current.answer(responseBody<CoursePage>()).then((body) => {
			const totalPages = body.totalItems === 0 ? 0 : Math.ceil(body.totalItems / pageSize);
			const expectedLength = Math.min(pageSize, Math.max(0, body.totalItems - (page - 1) * pageSize));
			return body.page === page && body.pageSize === pageSize && body.totalPages === totalPages && body.items.length === expectedLength && body.totalItems >= 12;
		}),
	);

const errorHasField = (field: string) => Question.about(`error field ${field}`, (current) => current.answer(responseBody<ErrorBody>()).then((body) => body.error.details.some((detail) => detail.field === field)));

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page uses defaults', () =>
	actor().attemptsTo(
		Ensure.that(responseBody<CoursePage>(), property('page', equals(1))),
		Ensure.that(responseBody<CoursePage>(), property('pageSize', equals(10))),
		Ensure.that(responseBody<CoursePage>(), property('totalItems', equals(12))),
		Ensure.that(responseBody<CoursePage>(), property('totalPages', equals(2))),
		Ensure.that(responseBody<CoursePage>(), property('items', property('length', equals(10)))),
	),
);

Then('every course matches keyword {string}', (keyword: string) => actor().attemptsTo(Ensure.that(resolved(coursesMatchKeyword(keyword)), equals(true))));

Then('every course has modality {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(responseBody<CoursePage>(), property('items', property('length', isGreaterThan(0)))),
		Ensure.that(responseBody<CoursePage>(), property('items', containItemsWhereEachItem(property('modality', equals(modality))))),
	),
);

Then('every course has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(responseBody<CoursePage>(), property('items', property('length', isGreaterThan(0)))),
		Ensure.that(responseBody<CoursePage>(), property('items', containItemsWhereEachItem(property('status', equals(status))))),
	),
);

Then('every course has tag {string}', (tag: string) => actor().attemptsTo(Ensure.that(resolved(coursesHaveTag(tag)), equals(true))));

Then('the course page has page {int} and pageSize {int}', (page: number, pageSize: number) => actor().attemptsTo(Ensure.that(resolved(coursePageMatches(page, pageSize)), equals(true))));

Then('courses are sorted by {string}', (field: string) => {
	if (field !== 'createdAt' && field !== 'title' && field !== 'updatedAt') throw new Error(`unsupported sort ${field}`);
	return actor().attemptsTo(Ensure.that(resolved(coursesAreSortedBy(field)), equals(true)));
});

Then('the course page is empty', () =>
	actor().attemptsTo(
		Ensure.that(responseBody<CoursePage>(), property('items', property('length', equals(0)))),
		Ensure.that(responseBody<CoursePage>(), property('totalItems', equals(0))),
		Ensure.that(responseBody<CoursePage>(), property('totalPages', equals(0))),
		Ensure.that(responseBody<CoursePage>(), property('page', equals(1))),
	),
);

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(responseBody<ErrorBody>(), property('error', property('code', equals(code))))));

Then('the error lists {int} details', (count: number) => actor().attemptsTo(Ensure.that(responseBody<ErrorBody>(), property('error', property('details', property('length', equals(count)))))));

Then('the error details include field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorHasField(field)), equals(true))));
