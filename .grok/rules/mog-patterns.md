# mog patterns (generated: scripts/grok-rules.mjs)

## `packages/axc-verification/acceptance-api/src/step-definitions/healthcheck.steps.ts`

```ts
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
```

## `packages/axc-verification/acceptance-api/src/questions.ts`

```ts
import type { Answerable } from '@serenity-js/core';
import { LastResponse, PatchRequest, Send } from '@serenity-js/rest';

// Serenity's QuestionAdapter<T> is typed as Question<Promise<T>>; the actor resolves it to T.
export const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

/** Typed last-response body: `Ensure.that(responseBody<T>(), equals(v))` or `actor.answer(responseBody<T>())`. */
export const responseBody = <T>(): Answerable<T> => resolved(LastResponse.body<T>());

/** JSON PATCH (object bodies are sent as JSON): `actor.attemptsTo(patchJson('/api/x/1', { k: v }))`. */
export const patchJson = (path: string, body: unknown) => Send.a(PatchRequest.to(path).with(body));
```

## `packages/axc/application-services/src/health.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, resolveEnvironment } from './index.ts';

describe('healthcheck', () => {
	it('maps runtime environments', () => {
		expect(resolveEnvironment('production')).toBe('production');
		expect(resolveEnvironment('test')).toBe('test');
		expect(resolveEnvironment('development')).toBe('local');
		expect(resolveEnvironment(undefined)).toBe('local');
	});

	it('returns the agentCourses health contract', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		const status = services.health.getStatus();

		expect(status.status).toBe('ok');
		expect(status.service).toBe('agentCourses-api');
		expect(status.projectCode).toBe('axc');
		expect(status.environment).toBe('test');
		expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
```
