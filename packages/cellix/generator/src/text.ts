import { isShapeNested, type ShapeField, type ShapeMember, type ShapeNested } from './shape.ts';
import type { FieldSpec } from './spec.ts';

export function tsType(type: string): string {
	if (type === 'boolean') return 'boolean';
	if (type === 'date') return 'Date';
	if (type === 'number') return 'number';
	if (type === 'string' || type === 'id') return 'string';
	return type;
}

export function mongooseField(field: ShapeField): string {
	if (field.type === 'boolean') return '{ type: Boolean, required: true }';
	if (field.type === 'date') return '{ type: Date, required: true }';
	if (field.type === 'number') return '{ type: Number, required: true }';
	if (field.type === 'string') return '{ type: String, required: true, minlength: 1, maxlength: 200 }';
	if (field.type.endsWith('[]')) return `{ type: [${mongooseScalar(field.type.slice(0, -2))}], required: true }`;
	return '{ type: String, required: true }';
}

export function gqlType(type: string): string {
	if (type.endsWith('[]')) return `[${gqlType(type.slice(0, -2)).replace(/!$/, '')}!]!`;
	if (type === 'boolean') return 'Boolean!';
	if (type === 'number') return 'Float!';
	if (type === 'string' || type === 'id') return 'String!';
	return 'String!';
}

export function serviceResult(input: { result?: string | undefined; operation?: 'query' | 'update' | undefined; kind: ActionKind; actionCamel: string; reference: string }): string {
	if (input.result) return input.result;
	if (input.operation === 'query' || input.kind === 'read') {
		if (input.operation !== 'query' && /^get(?:[A-Z]|$)/.test(input.actionCamel)) return `${input.reference} | null`;
		return `${input.reference}[]`;
	}
	return input.reference;
}

/** REST uses the route as the path name. GraphQL uses it as the field name. */
export function graphqlFieldName(actionCamel: string, transport: 'rest' | 'graphql' | undefined, route: string | undefined): string {
	if (transport === 'graphql' && route) return route;
	return actionCamel;
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

export type ActionKind = 'create' | 'update' | 'delete' | 'read';

export function actionKind(actionCamel: string): ActionKind {
	if (/^create(?:[A-Z]|$)/.test(actionCamel)) return 'create';
	if (/^update(?:[A-Z]|$)/.test(actionCamel)) return 'update';
	if (/^delete(?:[A-Z]|$)/.test(actionCamel)) return 'delete';
	return 'read';
}

/** The query and update commands choose the flow. The function name does not. */
export function assertOperationName(actionCamel: string, operation: 'query' | 'update'): void {
	if (operation === 'query' && /^(?:create|update|delete)(?:[A-Z]|$)/.test(actionCamel)) {
		throw new Error(`Query name ${actionCamel} is reserved for a mutation. Use the update command, or pick another name.`);
	}
	if (operation === 'update' && /^(?:query|get|find)(?:[A-Z]|$)/.test(actionCamel)) {
		throw new Error(`Update name ${actionCamel} is reserved for a read. Use the query command, or pick another name.`);
	}
}

export function paramShape(params: FieldSpec[]): { fields: ShapeField[]; nested: ShapeNested[] } {
	return { fields: params.map((field) => ({ name: field.name, pascal: field.name, type: field.type === 'id' ? 'string' : field.type })), nested: [] };
}

export function commandFields(shape: { fields: ShapeField[]; nested: ShapeNested[] }, kind: ActionKind): string {
	const lines = (optional: boolean) => [
		...shape.fields.map((field) => `${field.name}${optional ? '?' : ''}: ${tsType(field.type)};`),
		...shape.nested.map((item) => `${item.camel}${optional ? '?' : ''}: ${structuralType(item)};`),
	];
	if (kind === 'read') return (lines(true).length > 0 ? lines(true) : ['id: string;']).join('\n\t');
	if (kind === 'update') return ['id: string;', ...lines(false)].join('\n\t');
	return lines(false).join('\n\t');
}

/** Relative import of src/models-context.ts from a file under src/. */
export function persistenceModelsImport(depth: number): string {
	return `${'../'.repeat(depth)}models-context.ts`;
}

export function httpReadArgument(shape: { fields: ShapeField[]; nested: ShapeNested[] }): string {
	const parts = [...shape.fields.map((field) => httpSpread(field)), ...shape.nested.map((item) => `${item.camel}: {} as ${structuralType(item)}`)];
	if (parts.length === 0) return "{ id: c.req.query('id') ?? '' }";
	return `{ ${parts.join(', ')} }`;
}

function mongooseScalar(type: string): string {
	if (type === 'boolean') return 'Boolean';
	if (type === 'date') return 'Date';
	if (type === 'number') return 'Number';
	return 'String';
}

function httpSpread(field: ShapeField): string {
	const raw = `c.req.query('${field.name}')`;
	if (field.type === 'boolean') return `...(${raw} === undefined ? {} : { ${field.name}: ${raw} === 'true' })`;
	if (field.type === 'number') return `...(${raw} === undefined ? {} : { ${field.name}: Number(${raw}) })`;
	if (field.type === 'date') return `...(${raw} === undefined ? {} : { ${field.name}: new Date(${raw}) })`;
	return `...(${raw} === undefined ? {} : { ${field.name}: ${raw} })`;
}
