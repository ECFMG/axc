import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals, matches } from '@serenity-js/assertions';
import { actorCalled, Question } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { resolved, responseBody } from '../questions.ts';

interface HealthStatus {
	status: string;
	service: string;
	projectCode: string;
	environment: string;
	timestamp: string;
}

const actor = () => actorCalled('API client');

const healthField = <K extends keyof HealthStatus>(field: K) => Question.about(`the health ${field}`, (currentActor) => currentActor.answer(responseBody<HealthStatus>()).then((body) => body[field]));

When('the client requests the healthcheck', () => actor().attemptsTo(Send.a(GetRequest.to('/health'))));

Then('the healthcheck responds with status 200', () => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(200))));

Then('the healthcheck body matches the agentCourses contract', () =>
	actor().attemptsTo(
		Ensure.that(resolved(healthField('status')), equals('ok')),
		Ensure.that(resolved(healthField('service')), equals('agentCourses-api')),
		Ensure.that(resolved(healthField('projectCode')), equals('axc')),
		Ensure.that(resolved(healthField('environment')), equals('test')),
		Ensure.that(resolved(healthField('timestamp')), matches(/^\d{4}-\d{2}-\d{2}T/)),
	),
);
