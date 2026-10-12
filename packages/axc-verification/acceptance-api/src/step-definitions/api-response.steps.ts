import { Then } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { apiClient, responseErrorCode, responseStatus } from '../api-questions.ts';

Then('the API responds with status {int}', (status: number) => apiClient().attemptsTo(Ensure.that(responseStatus(), equals(status))));

Then('the API responds with error code {string}', (code: string) => apiClient().attemptsTo(Ensure.that(responseErrorCode(), equals(code))));
