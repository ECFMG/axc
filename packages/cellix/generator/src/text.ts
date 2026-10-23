import { isShapeNested, type ShapeField, type ShapeMember, type ShapeNested } from './shape.ts';

export function tsType(type: ShapeField['type']): string {
	if (type === 'boolean') return 'boolean';
	if (type === 'date') return 'Date';
	if (type === 'number') return 'number';
	return 'string';
}

export function mongooseField(field: ShapeField): string {
	if (field.type === 'boolean') return '{ type: Boolean, required: true }';
	if (field.type === 'date') return '{ type: Date, required: true }';
	if (field.type === 'number') return '{ type: Number, required: true }';
	if (field.type === 'string') return '{ type: String, required: true, minlength: 1, maxlength: 200 }';
	return '{ type: String, required: true }';
}

export function gqlType(type: ShapeField['type']): string {
	if (type === 'boolean') return 'Boolean!';
	if (type === 'number') return 'Float!';
	return 'String!';
}

export function namespacePath(contextPascal: string, entityPascal: string): string {
	return `${contextPascal}.${entityPascal}.${entityPascal}`;
}

export function propLines(members: ShapeMember[]): string {
	return members.map((member) => (isShapeNested(member) ? `\t${member.camel}: ${member.pascal}Props;` : `\t${member.name}: ${tsType(member.type)};`)).join('\n');
}

export function structuralType(item: ShapeNested): string {
	const parts = item.fields.map((member) => (isShapeNested(member) ? `${member.camel}: ${structuralType(member)}` : `${member.name}: ${tsType(member.type)}`));
	return `{ ${parts.join('; ')} }`;
}

export function commandFields(shape: { fields: ShapeField[]; nested: ShapeNested[] }, mutation: boolean): string {
	if (!mutation) return 'id: string;';
	const lines = [...shape.fields.map((field) => `${field.name}: ${tsType(field.type)};`), ...shape.nested.map((item) => `${item.camel}: ${structuralType(item)};`)];
	return lines.join('\n\t');
}
