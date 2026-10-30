export function visa(context: string, contextPascal: string): string {
	return `import type { Visa } from '@cellix/domain-seedwork/visa';\nimport type { ${contextPascal}DomainPermissions } from './${context}.domain-permissions.ts';\n\nexport interface ${contextPascal}Visa extends Visa<${contextPascal}DomainPermissions> {\n\tdetermineIf(func: (permissions: Readonly<${contextPascal}DomainPermissions>) => boolean): boolean;\n}\n`;
}
