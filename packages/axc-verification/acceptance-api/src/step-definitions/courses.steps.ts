import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { resolved, responseBody } from '../questions.ts';

interface Course {
	id: string;
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
		message: string;
		details: { field: string; message: string }[];
	};
}

const actor = () => actorCalled('API client');
const catalog = () => responseBody<CoursePage>();
const errorBody = () => responseBody<ErrorBody>();

const catalogCheck = (title: string, check: (body: CoursePage) => boolean) => Question.about(title, (current) => current.answer(catalog()).then(check));

When('the client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(resolved(catalogCheck('catalog page', (body) => body.page === page)), equals(true))));

Then('the catalog page size is {int}', (pageSize: number) => actor().attemptsTo(Ensure.that(resolved(catalogCheck('catalog page size', (body) => body.pageSize === pageSize)), equals(true))));

Then('the catalog item count is {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(catalogCheck('catalog item count', (body) => body.items.length === count)), equals(true))));

Then('the catalog item count is at most {int}', (count: number) => actor().attemptsTo(Ensure.that(resolved(catalogCheck('catalog item count limit', (body) => body.items.length <= count)), equals(true))));

Then('the catalog total items is {int}', (total: number) => actor().attemptsTo(Ensure.that(resolved(catalogCheck('catalog total items', (body) => body.totalItems === total)), equals(true))));

Then('the catalog total items is at least {int}', (total: number) => actor().attemptsTo(Ensure.that(resolved(catalogCheck('catalog total items lower bound', (body) => body.totalItems >= total)), equals(true))));

Then('the catalog total pages is {int}', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(catalogCheck('catalog total pages', (body) => body.totalPages === totalPages)), equals(true))));

Then('the catalog total pages matches the item total', () =>
	actor().attemptsTo(
		Ensure.that(resolved(catalogCheck('catalog pagination', (body) => body.totalPages === (body.totalItems === 0 ? 0 : Math.ceil(body.totalItems / body.pageSize)) && body.items.length <= body.pageSize)), equals(true)),
	),
);

Then('every course has modality {string}', (modality: string) =>
	actor().attemptsTo(Ensure.that(resolved(catalogCheck('modality filter', (body) => body.items.length > 0 && body.items.every((course) => course.modality === modality))), equals(true))),
);

Then('every course has status {string}', (status: string) =>
	actor().attemptsTo(Ensure.that(resolved(catalogCheck('status filter', (body) => body.items.length > 0 && body.items.every((course) => course.status === status))), equals(true))),
);

Then('every course has tag {string}', (tag: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(catalogCheck('tag filter', (body) => body.items.length > 0 && body.items.every((course) => course.tags.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())))), equals(true)),
	),
);

Then('every course matches keyword {string}', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				catalogCheck('keyword filter', (body) => {
					const needle = keyword.toLocaleLowerCase();
					return body.items.length > 0 && body.items.every((course) => [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase().includes(needle)));
				}),
			),
			equals(true),
		),
	),
);

Then('courses are sorted by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				catalogCheck('sort order', (body) => {
					if (field !== 'title' && field !== 'createdAt' && field !== 'updatedAt') {
						return false;
					}
					return (
						body.items.length > 1 &&
						body.items.every((course, index) => {
							const previous = body.items[index - 1];
							return previous === undefined || previous[field].localeCompare(course[field]) <= 0;
						})
					);
				}),
			),
			equals(true),
		),
	),
);

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(Question.about('error code', (current) => current.answer(errorBody()).then((body) => body.error.code))), equals(code))));

Then('the error message is {string}', (message: string) => actor().attemptsTo(Ensure.that(resolved(Question.about('error message', (current) => current.answer(errorBody()).then((body) => body.error.message))), equals(message))));

Then('the error lists {int} details', (count: number) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('error detail count', (current) => current.answer(errorBody()).then((body) => body.error.details.length))), equals(count))),
);

Then('the error details include field {string}', (field: string) =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('error detail field', (current) => current.answer(errorBody()).then((body) => body.error.details.some((detail) => detail.field === field)))), equals(true))),
);

Then('the catalog page has the documented fields', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				catalogCheck('documented shape', (body) => {
					const item = body.items[0];
					return (
						item !== undefined &&
						typeof body.page === 'number' &&
						typeof body.pageSize === 'number' &&
						typeof body.totalItems === 'number' &&
						typeof body.totalPages === 'number' &&
						typeof item.id === 'string' &&
						typeof item.title === 'string' &&
						typeof item.summary === 'string' &&
						typeof item.modality === 'string' &&
						typeof item.status === 'string' &&
						Array.isArray(item.tags) &&
						typeof item.createdAt === 'string' &&
						typeof item.updatedAt === 'string'
					);
				}),
			),
			equals(true),
		),
	),
);
