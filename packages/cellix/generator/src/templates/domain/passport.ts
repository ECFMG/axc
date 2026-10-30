import { camel } from '../../names.ts';

export function passport(context: string, contextPascal: string, entityPascal: string, permissions: string[]): string {
	return `import type { ${contextPascal}Visa } from './${context}/${context}.visa.ts';\n\nexport interface Passport {\n\t${camel(context)}: {\n\t\tfor${entityPascal}(entity: unknown): ${contextPascal}Visa;\n\t};\n}\n\nexport const PassportFactory = {\n\tforSystem(): Passport {\n\t\treturn {\n\t\t\t${camel(context)}: {\n\t\t\t\tfor${entityPascal}: () => ({\n\t\t\t\t\tdetermineIf: (check: (permissions: { ${permissions.map((permission) => `${permission}: boolean`).join('; ')} }) => boolean) => check({ ${permissions.map((permission) => `${permission}: true`).join(', ')} }),\n\t\t\t\t}),\n\t\t\t},\n\t\t};\n\t},\n};\n`;
}
