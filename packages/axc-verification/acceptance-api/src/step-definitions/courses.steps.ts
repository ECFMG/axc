import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;
const actor = () => actorCalled('API client');
interface Course {
	id: string;
	title: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
}
interface CoursesResponse {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
interface ErrorResponse {
	error: { code: string; details: { field: string }[] };
}
const body = () => Question.about('the courses response', async (currentActor) => currentActor.answer(LastResponse.body<CoursesResponse>()));
const error = () => Question.about('the error response', async (currentActor) => currentActor.answer(LastResponse.body<ErrorResponse>()));

When('the client requests courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses${query}`))));

Then('the courses response has status 200 and default pagination', () =>
	actor().attemptsTo(
		Ensure.that(resolved(LastResponse.status()), equals(200)),
		Ensure.that(
			resolved(
				Question.about('default metadata', async (currentActor) => {
					const result = await currentActor.answer(body());
					return [result.page, result.pageSize, result.totalItems, result.totalPages, result.items.length];
				}),
			),
			equals([1, 10, 12, 2, 10]),
		),
	),
);

Then('the courses response contains only course-001', () =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('matching ids', async (currentActor) => (await currentActor.answer(body())).items.map((item) => item.id))), equals(['course-001']))),
);

Then('the courses response has three AI courses', () =>
	actor().attemptsTo(Ensure.that(resolved(Question.about('AI course ids', async (currentActor) => (await currentActor.answer(body())).items.map((item) => item.id).sort())), equals(['course-001', 'course-006', 'course-012']))),
);

Then('the courses response is the second createdAt page', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('second page metadata and ids', async (currentActor) => {
					const result = await currentActor.answer(body());
					return [result.page, result.pageSize, result.totalItems, result.totalPages, ...result.items.map((item) => item.id)];
				}),
			),
			equals([2, 5, 12, 3, 'course-002', 'course-003', 'course-005', 'course-006', 'course-010']),
		),
	),
);

Then('the courses response is empty', () =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('empty result metadata', async (currentActor) => {
					const result = await currentActor.answer(body());
					return [result.items.length, result.totalItems, result.totalPages];
				}),
			),
			equals([0, 0, 0]),
		),
	),
);

Then('the courses response rejects {string}', (field: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(LastResponse.status()), equals(400)),
		Ensure.that(
			resolved(
				Question.about('query error', async (currentActor) => {
					const result = await currentActor.answer(error());
					return [result.error.code, result.error.details[0]?.field];
				}),
			),
			equals(['INVALID_QUERY_PARAMETER', field]),
		),
	),
);
