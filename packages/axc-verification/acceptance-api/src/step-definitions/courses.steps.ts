import { Then, When } from '@cucumber/cucumber';
import { containItemsWhereEachItem, Ensure, equals, isGreaterThan, property } from '@serenity-js/assertions';
import { actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { resolved, responseBody } from '../questions.ts';

interface CourseItem {
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
}

interface CoursePage {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorBody {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course page uses default pagination', () => {
	const defaults = Question.about('the default course page', (currentActor) =>
		currentActor.answer(responseBody<CoursePage>()).then((body) => {
			const titles = body.items.map((item) => item.title);
			const titleSorted = titles.every((title, index) => {
				const previous = titles[index - 1];
				return previous === undefined || previous.localeCompare(title) <= 0;
			});
			const first = body.items[0];
			const shaped = first !== undefined && first.title.length > 0 && first.summary.length > 0 && first.tags.length > 0 && first.createdAt.includes('T');
			return body.page === 1 && body.pageSize === 10 && body.items.length === 10 && body.totalItems > 10 && body.totalPages === Math.ceil(body.totalItems / body.pageSize) && titleSorted && shaped;
		}),
	);
	return actor().attemptsTo(Ensure.that(resolved(defaults), equals(true)));
});

Then('every course matches keyword {string}', (keyword: string) => {
	const matched = Question.about(`courses matching ${keyword}`, (currentActor) =>
		currentActor.answer(responseBody<CoursePage>()).then((body) => {
			const term = keyword.toLowerCase();
			return body.items.length > 0 && body.items.every((item) => item.title.toLowerCase().includes(term) || item.summary.toLowerCase().includes(term) || item.tags.some((tag) => tag.toLowerCase().includes(term)));
		}),
	);
	return actor().attemptsTo(Ensure.that(resolved(matched), equals(true)));
});

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

Then('every course has tag {string}', (tag: string) => {
	const matched = Question.about(`courses tagged ${tag}`, (currentActor) =>
		currentActor.answer(responseBody<CoursePage>()).then((body) => body.items.length > 0 && body.items.every((item) => item.tags.some((itemTag) => itemTag.toLowerCase() === tag.toLowerCase()))),
	);
	return actor().attemptsTo(Ensure.that(resolved(matched), equals(true)));
});

Then('the course page respects page size {int}', (pageSize: number) => {
	const window = Question.about(`a page of ${pageSize}`, (currentActor) =>
		currentActor
			.answer(responseBody<CoursePage>())
			.then(
				(body) => body.page === 1 && body.pageSize === pageSize && body.items.length > 0 && body.items.length <= pageSize && body.totalItems >= body.items.length && body.totalPages === Math.ceil(body.totalItems / body.pageSize),
			),
	);
	return actor().attemptsTo(Ensure.that(resolved(window), equals(true)));
});

Then('the courses are sorted by createdAt', () => {
	const sorted = Question.about('createdAt order', (currentActor) =>
		currentActor.answer(responseBody<CoursePage>()).then((body) => {
			const stamps = body.items.map((item) => item.createdAt);
			return (
				stamps.length > 1 &&
				stamps.every((stamp, index) => {
					const previous = stamps[index - 1];
					return previous === undefined || previous <= stamp;
				})
			);
		}),
	);
	return actor().attemptsTo(Ensure.that(resolved(sorted), equals(true)));
});

Then('the error details include {string}', (fields: string) => {
	const expected = fields.split(',').map((field) => field.trim());
	const detailsMatch = Question.about('invalid query details', (currentActor) =>
		currentActor.answer(responseBody<ErrorBody>()).then((body) => {
			const actual = body.error.details.map((detail) => detail.field);
			const messages = body.error.details.every((detail) => detail.message.trim().length > 0);
			return (
				body.error.code === 'INVALID_QUERY_PARAMETER' && body.error.message === 'One or more query parameters are invalid.' && messages && expected.every((field) => actual.includes(field)) && actual.length === expected.length
			);
		}),
	);
	return actor().attemptsTo(Ensure.that(resolved(detailsMatch), equals(true)));
});

Then('the course page has no matches', () => {
	const empty = Question.about('an empty course page', (currentActor) =>
		currentActor.answer(responseBody<CoursePage>()).then((body) => body.items.length === 0 && body.totalItems === 0 && body.totalPages === 0 && body.page === 1 && body.pageSize === 10),
	);
	return actor().attemptsTo(Ensure.that(resolved(empty), equals(true)));
});
