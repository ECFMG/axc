export function scalarValueObjects(names: string[], fallback: string): string {
	const classes = (names.length > 0 ? names : [fallback]).map((name) => `export class ${name} extends VOString({\n\ttrim: true,\n\tminLength: 1,\n\tmaxLength: 200,\n}) {}`).join('\n');
	return `import { VOString } from '@lucaspaganini/value-objects';\n\n${classes}\n`;
}
