import { Then, When } from '@cucumber/cucumber';
import { containItemsWhereEachItem, Ensure, equals, isGreaterThan, property } from '@serenity-js/assertions';
import { actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, PostRequest, Send } from '@serenity-js/rest';
import { patchJson, resolved, responseBody } from '../questions.ts';

interface CatalogBody {
	items: Array<{ id: string }>;
	page: number;
}

interface EnrollmentBody {
	id: string;
	status: string;
	courseId: string;
	learnerEmail: string;
	statusHistory: Array<{ fromStatus: string | null; toStatus: string }>;
}

interface EnrollmentListBody {
	items: Array<{ status: string; courseId: string; learnerEmail: string }>;
}

interface ErrorBody {
	error: { code: string };
}

const actor = () => actorCalled('API client');

let rememberedCourseId = '';
let rememberedRequestId = '';

const asObject = (raw: string): Record<string, unknown> => {
	const parsed: unknown = JSON.parse(raw);
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error('expected a JSON object');
	}
	return parsed as Record<string, unknown>;
};

When('the enrollment client requests {string}', (path: string) => actor().attemptsTo(Send.a(GetRequest.to(path))));

When('the enrollment client posts json to {string} with:', (path: string, raw: string) => actor().attemptsTo(Send.a(PostRequest.to(path).with(asObject(raw)))));

When('the enrollment client posts to {string} using the remembered course with:', (path: string, raw: string) => {
	const body = { ...asObject(raw), courseId: rememberedCourseId };
	return actor().attemptsTo(Send.a(PostRequest.to(path).with(body)));
});

When('the enrollment client gets the remembered enrollment request', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests/${rememberedRequestId}`))));

When('the enrollment client lists requests for learner {string}', (email: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?learnerEmail=${encodeURIComponent(email)}`))));

When('the enrollment client lists requests with status {string}', (status: string) => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?status=${encodeURIComponent(status)}`))));

When('the enrollment client lists requests for the remembered course', () => actor().attemptsTo(Send.a(GetRequest.to(`/api/enrollment-requests?courseId=${encodeURIComponent(rememberedCourseId)}`))));

When('the enrollment client patches the remembered request status with:', (raw: string) => actor().attemptsTo(patchJson(`/api/enrollment-requests/${rememberedRequestId}/status`, asObject(raw))));

Then('the enrollment response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the enrollment catalog items are not empty', () => actor().attemptsTo(Ensure.that(responseBody<CatalogBody>(), property('items', property('length', isGreaterThan(0))))));

Then('the enrollment catalog page is {int}', (page: number) => actor().attemptsTo(Ensure.that(responseBody<CatalogBody>(), property('page', equals(page)))));

Then('the enrollment client remembers the first course id', () =>
	actor()
		.answer(responseBody<CatalogBody>())
		.then((body) => {
			const id = body.items[0]?.id;
			if (id === undefined) {
				throw new Error('expected at least one course');
			}
			rememberedCourseId = id;
		}),
);

Then('the enrollment client remembers the request id', () =>
	actor()
		.answer(responseBody<EnrollmentBody>())
		.then((body) => {
			rememberedRequestId = body.id;
		}),
);

Then('the enrollment request status is {string}', (status: string) => actor().attemptsTo(Ensure.that(responseBody<EnrollmentBody>(), property('status', equals(status)))));

Then('the enrollment error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(responseBody<ErrorBody>(), property('error', property('code', equals(code))))));

Then('the enrollment status history has {int} entries', (n: number) => actor().attemptsTo(Ensure.that(responseBody<EnrollmentBody>(), property('statusHistory', property('length', equals(n))))));

Then('every listed enrollment request has learnerEmail {string}', (email: string) =>
	actor().attemptsTo(
		Ensure.that(responseBody<EnrollmentListBody>(), property('items', property('length', isGreaterThan(0)))),
		Ensure.that(responseBody<EnrollmentListBody>(), property('items', containItemsWhereEachItem(property('learnerEmail', equals(email))))),
	),
);

Then('every listed enrollment request has status {string}', (status: string) =>
	actor().attemptsTo(
		Ensure.that(responseBody<EnrollmentListBody>(), property('items', property('length', isGreaterThan(0)))),
		Ensure.that(responseBody<EnrollmentListBody>(), property('items', containItemsWhereEachItem(property('status', equals(status))))),
	),
);

Then('every listed enrollment request has the remembered course id', () =>
	actor().attemptsTo(
		Ensure.that(responseBody<EnrollmentListBody>(), property('items', property('length', isGreaterThan(0)))),
		Ensure.that(responseBody<EnrollmentListBody>(), property('items', containItemsWhereEachItem(property('courseId', equals(rememberedCourseId))))),
	),
);

Then('the first enrollment history toStatus is {string}', (toStatus: string) => {
	const actual = Question.about('first history toStatus', (currentActor) => currentActor.answer(responseBody<EnrollmentBody>()).then((body) => body.statusHistory[0]?.toStatus));
	return actor().attemptsTo(Ensure.that(resolved(actual), equals(toStatus)));
});
