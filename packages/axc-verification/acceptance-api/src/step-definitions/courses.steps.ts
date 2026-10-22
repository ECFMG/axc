import { Then, When } from '@cucumber/cucumber';
import { contain, Ensure, equals, isGreaterThan, isLessThan } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

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

const actor = () => actorCalled('API client');

const coursePage = <T>(description: string, read: (page: CoursePage) => T) => Question.about(description, async (currentActor) => read(await currentActor.answer(LastResponse.body<CoursePage>())));

When('the client searches courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(query ? `/api/courses?${query}` : '/api/courses'))));

Then('the course page is page {int} with page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage('the page number', (body) => body.page)), equals(page)), Ensure.that(resolved(coursePage('the page size', (body) => body.pageSize)), equals(pageSize))),
);

Then('the course page has at most {int} item(s)', (max: number) => actor().attemptsTo(Ensure.that(resolved(coursePage('the number of courses', (body) => body.items.length)), isLessThan(max + 1))));

Then('the course page has at least {int} item(s)', (min: number) => actor().attemptsTo(Ensure.that(resolved(coursePage('the number of courses', (body) => body.items.length)), isGreaterThan(min - 1))));

Then('the course page has {int} item(s)', (count: number) => actor().attemptsTo(Ensure.that(resolved(coursePage('the number of courses', (body) => body.items.length)), equals(count))));

Then('the course page reports at least {int} total items', (min: number) => actor().attemptsTo(Ensure.that(resolved(coursePage('the total number of courses', (body) => body.totalItems)), isGreaterThan(min - 1))));

Then('the course page reports {int} total items', (count: number) => actor().attemptsTo(Ensure.that(resolved(coursePage('the total number of courses', (body) => body.totalItems)), equals(count))));

Then('the course page reports total pages for page size {int}', (pageSize: number) =>
	actor().attemptsTo(Ensure.that(resolved(coursePage('totalPages compared with ceil(totalItems / pageSize)', (body) => body.totalPages - Math.ceil(body.totalItems / pageSize))), equals(0))),
);

Then('every course mentions {string} in its title, summary, or tags', (keyword: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				coursePage(`the courses not mentioning ${keyword}`, (body) => body.items.filter((course) => !`${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase().includes(keyword)).map((course) => course.title)),
			),
			equals([]),
		),
	),
);

Then('the course titles include {string}', (title: string) => actor().attemptsTo(Ensure.that(resolved(coursePage('the course titles', (body) => body.items.map((course) => course.title))), contain(title))));

Then('every course has {word} {string}', (field: string, value: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				coursePage(`the courses whose ${field} is not ${value}`, (body) =>
					body.items.filter((course) => (field === 'tag' ? !course.tags.includes(value) : course[field as 'modality' | 'status'] !== value)).map((course) => course.title),
				),
			),
			equals([]),
		),
	),
);

Then('the courses are sorted by {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				coursePage(`whether the courses are in ${field} order`, (body) => {
					const values = body.items.map((course) => course[field as 'createdAt' | 'updatedAt']);
					return values.every((value, index) => index === 0 || (values[index - 1] ?? '') <= value);
				}),
			),
			equals(true),
		),
	),
);
