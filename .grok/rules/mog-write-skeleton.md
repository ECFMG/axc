# mog write-command skeleton (preloaded)

Builds on the read-only feature skeleton in the map (same flat folders, same `<placeholders>`; `is<Thing>Kind` comes from `<feature>.ts`).

Pure domain rules + transitions → `application-services/src/<feature>.rules.ts` (no I/O, no clock) with `<feature>.rules.test.ts`. Cellix would put them in `@axc/domain`, but app-services doesn't depend on it and adding the dep churns the lockfile, so they stay here; REST reaches them via `@axc/application-services`.
```ts
import type { <Thing>Kind } from './<feature>.ts';

export const canChangeKind = (from: <Thing>Kind, to: <Thing>Kind): boolean => from !== to;
```
`application-services/src/<feature>.store.ts` — typed domain error + store with injectable id/clock (tests pass `{ newId, now }`):
```ts
import type { <Thing>, <Thing>Kind } from './<feature>.ts';
import { canChangeKind } from './<feature>.rules.ts';

export type <Feature>ErrorCode = 'not_found' | 'invalid_state';
export class <Feature>Error extends Error {
	readonly code: <Feature>ErrorCode;
	constructor(code: <Feature>ErrorCode, message: string) {
		super(message);
		this.code = code;
	}
}
let seq = 0;
export const create<Thing>Store = ({ newId, now } = { newId: () => `<thing>-${++seq}`, now: () => new Date() }) => {
	const items = new Map<string, <Thing> & { updatedAt: string }>();
	const save = (t: <Thing>) => {
		const saved = { ...t, updatedAt: now().toISOString() };
		items.set(t.id, saved);
		return saved;
	};
	return {
		create: (kind: <Thing>Kind) => save({ id: newId(), kind }),
		update(id: string, kind: <Thing>Kind) {
			const t = items.get(id);
			if (!t) throw new <Feature>Error('not_found', `<thing> ${id} not found`);
			if (!canChangeKind(t.kind, kind)) throw new <Feature>Error('invalid_state', `cannot change ${t.kind} to ${kind}`);
			return save({ ...t, kind });
		},
	};
};
export type <Thing>Store = ReturnType<typeof create<Thing>Store>;
```
`application-services/src/index.ts`: export `<Feature>Error` and `type <Feature>ErrorCode` from the store; `ApplicationServices.<feature>` becomes `{ list(q: <Feature>Query): <Thing>[] } & <Thing>Store`; in `buildApplicationServicesFactory`, before `forRequest`, `const <feature>Store = create<Thing>Store();` (once per process, so state survives requests) and `forRequest` returns `<feature>: { list: list<Thing>s, ...<feature>Store }`.
`rest/src/<feature>.commands.ts` — body parse (malformed / non-object → 400), path param, one status mapper:
```ts
import { type ApplicationServicesFactory, <Feature>Error, type <Feature>ErrorCode, is<Thing>Kind } from '@axc/application-services';
import type { Context, Hono } from 'hono';

const errorBody = (details: { field: string; message: string }[]) => ({ details }); // placeholder: task spec's shape
const STATUS = { not_found: 404, invalid_state: 409 } as const satisfies Record<<Feature>ErrorCode, number>;
const fail = (c: Context, e: unknown) => {
	if (e instanceof <Feature>Error) return c.json(errorBody([{ field: 'id', message: e.message }]), STATUS[e.code]);
	throw e;
};
const readObject = async (c: Context): Promise<Record<string, unknown> | undefined> => {
	try {
		const body: unknown = await c.req.json();
		return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : undefined;
	} catch {
		return undefined;
	}
};

export function register<Feature>Commands(app: Hono, factory: ApplicationServicesFactory): void {
	app.post('/api/<feature>', async (c) => {
		const body = await readObject(c);
		if (!body) return c.json(errorBody([{ field: 'body', message: 'must be a JSON object' }]), 400);
		const { kind } = body;
		if (!is<Thing>Kind(kind)) return c.json(errorBody([{ field: 'kind', message: 'invalid' }]), 400);
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(services.<feature>.create(kind), 201);
	});
	app.patch('/api/<feature>/:id', async (c) => {
		const { kind } = (await readObject(c)) ?? {};
		if (!is<Thing>Kind(kind)) return c.json(errorBody([{ field: 'kind', message: 'invalid' }]), 400);
		const services = await factory.forRequest(c.req.header('Authorization'));
		try {
			return c.json(services.<feature>.update(c.req.param('id'), kind));
		} catch (e) {
			return fail(c, e);
		}
	});
}
```
Mount it beside the routes (`register<Feature>Commands(app, applicationServicesFactory)`).
