import type { Answerable } from '@serenity-js/core';
import { LastResponse, PatchRequest, Send } from '@serenity-js/rest';

// Serenity's QuestionAdapter<T> is typed as Question<Promise<T>>; the actor resolves it to T.
export const resolved = <T>(answerable: Answerable<Promise<T>>): Answerable<T> => answerable as unknown as Answerable<T>;

/** Typed last-response body: `Ensure.that(responseBody<T>(), equals(v))` or `actor.answer(responseBody<T>())`. */
export const responseBody = <T>(): Answerable<T> => resolved(LastResponse.body<T>());

/** JSON PATCH (object bodies are sent as JSON): `actor.attemptsTo(patchJson('/api/x/1', { k: v }))`. */
export const patchJson = (path: string, body: unknown) => Send.a(PatchRequest.to(path).with(body));
