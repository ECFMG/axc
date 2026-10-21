import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Answerable, actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PostRequest, Send } from '@serenity-js/rest';

const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

interface CourseSearchBody {
	items: { id: string }[];
	totalItems: number;
}

interface ErrorBody {
	error: { code: string; details: { field: string }[] };
}

interface EnrollmentBody {
	courseId: string;
	status: string;
	statusHistory: { fromStatus: string | null; toStatus: string; changedBy: string }[];
}

const actor = () => actorCalled('API client');

const responseBody = <T>() => LastResponse.body<T>();

When('the client creates an enrollment request for {string}', (courseId: string) =>
	actor().attemptsTo(
		Send.a(
			PostRequest.to('/api/enrollment-requests').with({
				courseId,
				learnerEmail: 'learner@example.org',
				justification: 'I need this course to prepare for upcoming secure development work.',
			}),
		),
	),
);

When('the client searches courses with {string}', (query: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/courses?${query}`))));

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the enrollment request is pending for {string}', (courseId: string) =>
	actor().attemptsTo(
		Ensure.that(resolved(enrollmentField('courseId')), equals(courseId)),
		Ensure.that(resolved(enrollmentField('status')), equals('pending')),
		Ensure.that(resolved(enrollmentHistoryCount()), equals(1)),
		Ensure.that(resolved(enrollmentHistoryFromStatus()), equals(null)),
		Ensure.that(resolved(enrollmentHistoryToStatus()), equals('pending')),
		Ensure.that(resolved(enrollmentHistoryChangedBy()), equals('system')),
	),
);

Then('the course search returns the online active security courses', () =>
	actor().attemptsTo(Ensure.that(resolved(courseTotalItems()), equals(2)), Ensure.that(resolved(courseItemId(0)), equals('course-001')), Ensure.that(resolved(courseItemId(1)), equals('course-006'))),
);

Then('the course search error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode()), equals(code))));

Then('the course search error field is {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorField()), equals(field))));

const enrollmentField = <K extends keyof EnrollmentBody>(field: K) =>
	Question.about(`the enrollment ${field}`, async (currentActor) => {
		const body = await currentActor.answer(responseBody<EnrollmentBody>());
		return body[field];
	});

const enrollmentHistoryCount = () =>
	Question.about('the enrollment history count', async (currentActor) => {
		const body = await currentActor.answer(responseBody<EnrollmentBody>());
		return body.statusHistory.length;
	});

const enrollmentHistoryFromStatus = () =>
	Question.about('the initial fromStatus', async (currentActor) => {
		const body = await currentActor.answer(responseBody<EnrollmentBody>());
		return body.statusHistory[0]?.fromStatus;
	});

const enrollmentHistoryToStatus = () =>
	Question.about('the initial toStatus', async (currentActor) => {
		const body = await currentActor.answer(responseBody<EnrollmentBody>());
		return body.statusHistory[0]?.toStatus ?? '';
	});

const enrollmentHistoryChangedBy = () =>
	Question.about('the initial changedBy', async (currentActor) => {
		const body = await currentActor.answer(responseBody<EnrollmentBody>());
		return body.statusHistory[0]?.changedBy ?? '';
	});

const courseTotalItems = () =>
	Question.about('the course total', async (currentActor) => {
		const body = await currentActor.answer(responseBody<CourseSearchBody>());
		return body.totalItems;
	});

const courseItemId = (index: number) =>
	Question.about(`course item ${index} id`, async (currentActor) => {
		const body = await currentActor.answer(responseBody<CourseSearchBody>());
		return body.items[index]?.id ?? '';
	});

const errorCode = () =>
	Question.about('the error code', async (currentActor) => {
		const body = await currentActor.answer(responseBody<ErrorBody>());
		return body.error.code;
	});

const errorField = () =>
	Question.about('the error field', async (currentActor) => {
		const body = await currentActor.answer(responseBody<ErrorBody>());
		return body.error.details[0]?.field ?? '';
	});
