import { camel } from '../../names.ts';
import { isShapeNested, type Shape, type ShapeField, type ShapeNested } from '../../shape.ts';

export function seed(entity: string, entityPascal: string, shape: Shape): string {
	const seedName = `${camel(entity)}Seed`;
	const fields = seedEntries(shape)
		.map(([key, value]) => `\t\t${key}: ${value},`)
		.join('\n');
	const comment = `/** Insert ${seedName} into the ${entityPascal} collection. One object is the example. A catalog task adds the other rows to this array. Start the application and read them back through the endpoint. Do not copy this document into a handler, a read repository, or an in-memory catalog. */`;
	const insert = `// collection.insertMany(${seedName} as unknown as Parameters<typeof collection.insertMany>[0])`;
	return `${comment}\nexport const ${seedName} = [\n\t{\n${fields}\n\t},\n];\n${insert}\n`;
}

function seedEntries(shape: Shape): [string, string][] {
	const entries = new Map<string, string>([
		['_id', "'000000000000000000000001'"],
		['schemaVersion', "'1.0.0'"],
		['version', '0'],
	]);
	for (const field of shape.fields) entries.set(field.name, sampleScalar(field));
	for (const item of shape.nested) entries.set(item.camel, sampleNested(item));
	if (!entries.has('createdAt')) entries.set('createdAt', "new Date('2024-01-01T00:00:00.000Z')");
	if (!entries.has('updatedAt')) entries.set('updatedAt', "new Date('2024-01-01T00:00:00.000Z')");
	return [...entries];
}

function sampleNested(item: ShapeNested): string {
	const parts = item.fields.map((member) => (isShapeNested(member) ? `${member.camel}: ${sampleNested(member)}` : `${member.name}: ${sampleScalar(member)}`));
	return `{ ${parts.join(', ')} }`;
}

function sampleScalar(field: ShapeField): string {
	if (field.type === 'boolean') return 'false';
	if (field.type === 'date') return "new Date('2024-01-01T00:00:00.000Z')";
	if (field.type === 'number') return '1';
	if (field.type.endsWith('[]')) return `['Example ${field.name}']`;
	const quoted = field.type.split('|').find((part) => /^'[^']+'$/.test(part.trim()));
	if (quoted) return quoted.trim();
	return `'Example ${field.name}'`;
}
