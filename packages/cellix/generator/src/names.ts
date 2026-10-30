export function camel(value: string): string {
	return value.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

export function pascal(value: string): string {
	const next = camel(value);
	return next.slice(0, 1).toUpperCase() + next.slice(1);
}
