import { isShapeNested, type ShapeNested } from '../../shape.ts';
import { propLines } from '../../text.ts';

export function nestedValueObject(item: ShapeNested, names: string[]): string {
	const classes = (names.length > 0 ? names : [`${item.pascal}Value`]).map((name) => `export class ${name} extends VOString({\n\ttrim: true,\n\tminLength: 1,\n\tmaxLength: 200,\n}) {}`).join('\n');
	const childImports = item.fields
		.filter(isShapeNested)
		.map((child) => `import type { ${child.pascal}Props } from './${child.name}.${child.kind === 'entity' ? 'entity' : 'value-objects'}.ts';`)
		.join('\n');
	const header = item.kind === 'value' ? `export interface ${item.pascal}Props {\n${propLines(item.fields)}\n}\n\n` : '';
	const imports = ["import { VOString } from '@lucaspaganini/value-objects';", childImports].filter((line) => line.length > 0).join('\n');
	return `${imports}\n\n${header}${classes}\n`;
}
