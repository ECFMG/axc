import { codeOf, isTestFile, type SourceFile } from '../support/workspace.ts';

// Every Hono route in @axc/rest must be registered as an Azure Function in apps/api, and every
// registration must reach a Hono route. host.json sets routePrefix "" so both sides use the
// full path; Hono `:id` and Azure `{id}` / `{id:guid}` are the same parameter.

interface HttpRoute {
	method: string;
	path: string;
	source: string;
}

const honoRoutePattern = /\.(get|post|put|patch|delete|options|head)\(\s*(['"`])(\/[^'"`]*)\2/g;
const honoMountPattern = /\.(route|basePath)\(\s*['"`]/;
const registrationPattern = /registerAzureFunctionHttpHandler\(\s*(['"`])([^'"`]+)\1\s*,\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;

export function normalizeRoutePath(routePath: string): string {
	return routePath
		.replace(/^\/+|\/+$/g, '')
		.replace(/\{\*?(\w+)(:[^}]*)?\??\}/g, '{$1}')
		.replace(/:(\w+)(\{[^}]*\})?\??/g, '{$1}');
}

export function honoRoutes(files: readonly SourceFile[]): { routes: HttpRoute[]; violations: string[] } {
	const routes: HttpRoute[] = [];
	const violations: string[] = [];
	for (const file of files) {
		if (isTestFile(file.path)) {
			continue;
		}
		for (const match of codeOf(file).matchAll(honoRoutePattern)) {
			routes.push({ method: (match[1] ?? '').toUpperCase(), path: normalizeRoutePath(match[3] ?? ''), source: file.path });
		}
		if (honoMountPattern.test(codeOf(file))) {
			violations.push(`[${file.path}] Declare Hono routes with their full path (app.get('/api/things/:id', ...)). Mounted sub-apps (.route/.basePath) hide the path from the Azure registration check.`);
		}
	}
	return { routes, violations };
}

export function azureRegistrations(file: SourceFile): { routes: HttpRoute[]; violations: string[] } {
	const routes: HttpRoute[] = [];
	const violations: string[] = [];
	for (const match of codeOf(file).matchAll(registrationPattern)) {
		const name = match[2] ?? '';
		const options = match[3] ?? '';
		const route = /route:\s*(['"`])([^'"`]*)\1/.exec(options)?.[2];
		const methods = [...(/methods:\s*\[([^\]]*)\]/.exec(options)?.[1]?.matchAll(/['"`](\w+)['"`]/g) ?? [])].map((m) => (m[1] ?? '').toUpperCase());
		if (route === undefined || methods.length === 0) {
			violations.push(`[${file.path}] Azure handler '${name}' must declare both route and methods, e.g. { route: 'api/things/{id}', methods: ['GET'], authLevel: 'anonymous' }.`);
			continue;
		}
		for (const method of methods) {
			routes.push({ method, path: normalizeRoutePath(route), source: `${file.path} (${name})` });
		}
	}
	return { routes, violations };
}

export function routeParityViolations(hono: readonly HttpRoute[], azure: readonly HttpRoute[]): string[] {
	const key = (route: HttpRoute) => `${route.method} ${route.path}`;
	const registered = new Set(azure.map(key));
	const handled = new Set(hono.map(key));
	const violations: string[] = [];
	for (const route of hono) {
		if (!registered.has(key(route))) {
			violations.push(
				`[${route.source}] Hono route ${route.method} /${route.path} is unreachable: register it in apps/api/src/index.ts with .registerAzureFunctionHttpHandler('<name>', { route: '${route.path}', methods: ['${route.method}'], authLevel: 'anonymous' }, restHandlerCreator).`,
			);
		}
	}
	for (const route of azure) {
		if (!handled.has(key(route))) {
			violations.push(`[${route.source}] Azure route ${route.method} /${route.path} has no matching Hono route in @axc/rest, so it always returns 404.`);
		}
	}
	return violations;
}
