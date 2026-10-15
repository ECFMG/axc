import { Then, When } from '@cucumber/cucumber';
import { contain, Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

const actor = () => actorCalled('API client');

const justification = 'I need this course to prepare for upcoming secure development work.';

interface CoursePage {
	items: { title: string }[];
}

interface ErrorBody {
	error: { code: string };
}

interface EnrollmentBody {
	id: string;
	status: string;
	statusHistory: { fromStatus: string | null; toStatus: string }[];
}

When('the client searches courses with q {string}, modality {string}, and status {string}', (q: string, modality: string, status: string) =>
	actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?q=${q}&modality=${modality}&status=${status}`))),
);

When('the client searches courses with page size {string}', (pageSize: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?pageSize=${pageSize}`))));

When('the client creates an enrollment request for course {string}', (courseId: string) =>
	actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail: 'learner@example.org',
				justification,
			}),
		),
	),
);

When('the client reads that enrollment request', () =>
	actor().attemptsTo(
		Send.a(
			GetRequest.to(
				Question.about('the created enrollment request path', async (current) => {
					const body = await current.answer(LastResponse.body<EnrollmentBody>());
					return `/api/enrollment-requests/${body.id}`;
				}),
			),
		),
	),
);

Then('the course search responds with status {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the enrollment response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the course search includes {string}', (title: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('course titles', async (current) => {
					const body = await current.answer(LastResponse.body<CoursePage>());
					return body.items.map((item) => item.title);
				}),
			),
			contain(title),
		),
	),
);

Then('the course search error code is {string}', (code: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the course error code', async (current) => {
					const body = await current.answer(LastResponse.body<ErrorBody>());
					return body.error.code;
				}),
			),
			equals(code),
		),
	),
);

Then('the enrollment request status is {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the enrollment status', async (current) => {
					const body = await current.answer(LastResponse.body<EnrollmentBody>());
					return body.status;
				}),
			),
			equals(status),
		),
	),
);

Then('the enrollment history starts at {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(
			resolved(
				Question.about('the first enrollment history status', async (current) => {
					const body = await current.answer(LastResponse.body<EnrollmentBody>());
					const first = body.statusHistory[0];
					return first === undefined ? '' : `${String(first.fromStatus)}:${first.toStatus}`;
				}),
			),
			equals(`null:${status}`),
		),
	),
);
