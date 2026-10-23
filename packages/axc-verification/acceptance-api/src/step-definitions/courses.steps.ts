import { Then, When } from '@cucumber/cucumber';
import { containItemsWhereEachItem, Ensure, equals, isGreaterThan, property } from '@serenity-js/assertions';
import { actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { resolved, responseBody } from '../questions.ts';

interface CatalogCourse {
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
}

interface CatalogBody {
	items: CatalogCourse[];
	page: number;
	pageSize: number;
	totalItems: number;
}

interface ErrorBody {
	error: {
		details: unknown[];
	};
}

const actor = () => actorCalled('API client');

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the catalog page is {int} with page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(Ensure.that(responseBody<CatalogBody>(), property('page', equals(page))), Ensure.that(responseBody<CatalogBody>(), property('pageSize', equals(pageSize)))),
);

Then('the catalog contains {int} items', (n: number) => actor().attemptsTo(Ensure.that(responseBody<CatalogBody>(), property('items', property('length', equals(n))))));

Then('the catalog contains at most {int} items', (n: number) => {
	const atMost = Question.about(`at most ${n} catalog items`, (currentActor) => currentActor.answer(responseBody<CatalogBody>()).then((body) => body.items.length <= n));
	actor().attemptsTo(Ensure.that(resolved(atMost), equals(true)));
});

Then('every course matches keyword {string}', (keyword: string) => {
	const matches = Question.about(`every course matches ${keyword}`, (currentActor) =>
		currentActor.answer(responseBody<CatalogBody>()).then((body) => {
			const needle = keyword.toLowerCase();
			return body.items.length > 0 && body.items.every((course) => course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle)));
		}),
	);
	actor().attemptsTo(Ensure.that(resolved(matches), equals(true)));
});

Then('every course has modality {string}', (modality: string) =>
	actor().attemptsTo(
		Ensure.that(responseBody<CatalogBody>(), property('items', property('length', isGreaterThan(0)))),
		Ensure.that(responseBody<CatalogBody>(), property('items', containItemsWhereEachItem(property('modality', equals(modality))))),
	),
);

Then('every course has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(responseBody<CatalogBody>(), property('items', property('length', isGreaterThan(0)))),
		Ensure.that(responseBody<CatalogBody>(), property('items', containItemsWhereEachItem(property('status', equals(status))))),
	),
);

Then('every course has tag {string}', (tag: string) => {
	const hasTag = Question.about(`every course has tag ${tag}`, (currentActor) =>
		currentActor.answer(responseBody<CatalogBody>()).then((body) => body.items.length > 0 && body.items.every((course) => course.tags.some((item) => item.toLowerCase() === tag.toLowerCase()))),
	);
	actor().attemptsTo(Ensure.that(resolved(hasTag), equals(true)));
});

Then('the courses are sorted by createdAt', () => {
	const sorted = Question.about('createdAt order', (currentActor) =>
		currentActor.answer(responseBody<CatalogBody>()).then((body) =>
			body.items.every((course, index, items) => {
				const previous = items[index - 1];
				return previous === undefined || previous.createdAt <= course.createdAt;
			}),
		),
	);
	actor().attemptsTo(Ensure.that(resolved(sorted), equals(true)));
});

Then('the error lists {int} details', (n: number) => actor().attemptsTo(Ensure.that(responseBody<ErrorBody>(), property('error', property('details', property('length', equals(n)))))));

Then('the items list is empty', () => actor().attemptsTo(Ensure.that(responseBody<CatalogBody>(), property('items', property('length', equals(0))))));

Then('the catalog total items is {int}', (n: number) => actor().attemptsTo(Ensure.that(responseBody<CatalogBody>(), property('totalItems', equals(n)))));
