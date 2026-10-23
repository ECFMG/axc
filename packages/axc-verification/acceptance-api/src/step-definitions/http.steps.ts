import { Then } from '@cucumber/cucumber';
import { contain, Ensure, equals } from '@serenity-js/assertions';
import { LastResponse } from '@serenity-js/rest';
import { actor, errorCode, errorFields, resolved } from './http.ts';

Then('the response status is {int}', (status: number) => actor().attemptsTo(Ensure.that(resolved(LastResponse.status()), equals(status))));

Then('the error code is {string}', (code: string) => actor().attemptsTo(Ensure.that(resolved(errorCode()), equals(code))));

Then('the error details include field {string}', (field: string) => actor().attemptsTo(Ensure.that(resolved(errorFields()), contain(field))));
