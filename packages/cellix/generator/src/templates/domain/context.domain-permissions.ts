export function domainPermissions(contextPascal: string, permissions: string[]): string {
	return `export interface ${contextPascal}DomainPermissions {\n${permissions.map((permission) => `\t${permission}: boolean;`).join('\n')}\n}\n`;
}
