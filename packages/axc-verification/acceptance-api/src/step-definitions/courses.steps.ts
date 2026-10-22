import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

interface CourseBody {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CoursePageBody {
	items: CourseBody[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

async function readPage(current: { answer<T>(answerable: Answerable<T>): Promise<T> }): Promise<CoursePageBody> {
	return await current.answer(LastResponse.body<CoursePageBody>());
}

const pageNumber = (field: 'page' | 'pageSize' | 'totalItems' | 'totalPages') =>
	Question.about(`the course ${field}`, async (current) => {
		const body = await readPage(current);
		return body[field];
	});

const itemCount = Question.about('the course item count', async (current) => {
	const body = await readPage(current);
	return body.items.length;
});

const firstCourseId = Question.about('the first course id', async (current) => {
	const body = await readPage(current);
	return body.items[0]?.id ?? '';
});

const titlesInclude = (first: string, second: string) =>
	Question.about(`the course page includes ${first} and ${second}`, async (current) => {
		const body = await readPage(current);
		const titles = body.items.map((item) => item.title);
		return titles.includes(first) && titles.includes(second);
	});

const everyCourse = (description: string, predicate: (course: CourseBody) => boolean) =>
	Question.about(description, async (current) => {
		const body = await readPage(current);
		return body.items.length > 0 && body.items.every(predicate);
	});

const createdAtSorted = Question.about('courses sorted by createdAt', async (current) => {
	const body = await readPage(current);
	const dates = body.items.map((item) => item.createdAt);
	const sorted = [...dates].sort();
	return dates.length > 1 && dates.every((date, index) => date === sorted[index]);
});

When('the client requests the course catalog', () => actor().attemptsTo(Send.a(GetRequest.to('/api/courses'))));

When('the client searches courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the course page uses page {int} and page size {int}', (page: number, pageSize: number) =>
	actor().attemptsTo(Ensure.that(resolved(pageNumber('page')), equals(page)), Ensure.that(resolved(pageNumber('pageSize')), equals(pageSize))),
);

Then('the course page lists {int} of {int} courses', (count: number, total: number) => actor().attemptsTo(Ensure.that(resolved(itemCount), equals(count)), Ensure.that(resolved(pageNumber('totalItems')), equals(total))));

Then('the course page has {int} total pages', (totalPages: number) => actor().attemptsTo(Ensure.that(resolved(pageNumber('totalPages')), equals(totalPages))));

Then('the course page total is {int}', (total: number) => actor().attemptsTo(Ensure.that(resolved(pageNumber('totalItems')), equals(total))));

Then('the first course is {string}', (id: string) => actor().attemptsTo(Ensure.that(resolved(firstCourseId), equals(id))));

Then('the course page includes {string} and {string}', (first: string, second: string) => actor().attemptsTo(Ensure.that(resolved(titlesInclude(first, second)), equals(true))));

Then('every returned course matches {string} in the title, summary, or tags', (keyword: string) =>
	actor().attemptsTo(Ensure.that(resolved(everyCourse(`every course matches ${keyword}`, (course) => matchesKeyword(course, keyword))), equals(true))),
);

Then('every returned course has modality {string}', (modality: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse(`every course has modality ${modality}`, (course) => course.modality === modality)), equals(true))));

Then('every returned course has status {string}', (status: string) => actor().attemptsTo(Ensure.that(resolved(everyCourse(`every course has status ${status}`, (course) => course.status === status)), equals(true))));

Then('every returned course contains the tag {string}', (tag: string) =>
	actor().attemptsTo(Ensure.that(resolved(everyCourse(`every course contains tag ${tag}`, (course) => course.tags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase()))), equals(true))),
);

Then('the courses are sorted by createdAt ascending', () => actor().attemptsTo(Ensure.that(resolved(createdAtSorted), equals(true))));

function matchesKeyword(course: CourseBody, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	if (course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => tag.toLowerCase().includes(needle));
}
