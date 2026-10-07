export type FieldType = 'string' | 'boolean' | 'date' | 'number' | 'id';

export interface FieldSpec {
	name: string;
	type: FieldType;
}

export type NestedMember = FieldSpec | NestedSpec;

export interface NestedSpec {
	name: string;
	kind: 'value' | 'entity';
	fields: NestedMember[];
}

const FIELD_TYPES = new Set<FieldType>(['string', 'boolean', 'date', 'number', 'id']);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAMEL = /^[a-z][A-Za-z0-9]*$/;

export interface ParsedArgs {
	get(key: string): string | undefined;
	list(key: string): string[];
	has(key: string): boolean;
}

export function parseArgv(argv: string[]): ParsedArgs {
	const values = new Map<string, string>();
	const lists = new Map<string, string[]>();
	const flags = new Set<string>();
	const repeated = new Set(['field', 'permission', 'nested']);
	const booleans = new Set(['resolver']);
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index] ?? '';
		if (!token.startsWith('--')) continue;
		const key = token.slice(2);
		if (booleans.has(key)) {
			flags.add(key);
			continue;
		}
		const value = argv[index + 1];
		if (!value || value.startsWith('--')) continue;
		index += 1;
		if (repeated.has(key)) {
			const list = lists.get(key) ?? [];
			list.push(value);
			lists.set(key, list);
			continue;
		}
		values.set(key, value);
	}
	return {
		get: (key) => values.get(key),
		list: (key) => lists.get(key) ?? [],
		has: (key) => flags.has(key),
	};
}

export function parseField(token: string): FieldSpec {
	const field = readField(token);
	if (field.name === 'id' || field.type === 'id') {
		throw new Error('id is the aggregate identity. Use --nested <name>:id:id,... when a child object has its own id');
	}
	return field;
}

export function parsePermission(token: string): string {
	const name = camel(token);
	if (!CAMEL.test(name)) throw new Error(`Permission must be camelCase, received ${token}`);
	return name;
}

export interface FeatureShapeInput {
	fields: FieldSpec[];
	permissions: string[];
	nested: NestedSpec[];
}

export function parseFieldsFile(text: string): FeatureShapeInput {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error('Fields file must be JSON');
	}
	if (!isRecord(parsed)) throw new Error('Fields file must be a JSON object');
	for (const key of Object.keys(parsed)) {
		if (key !== 'fields' && key !== 'permissions' && key !== 'nested') throw new Error(`Fields file has unknown key ${key}`);
	}
	return {
		fields: readList(parsed.fields, 'fields').map((entry) => parseField(fieldToken(entry))),
		permissions: readList(parsed.permissions, 'permissions').map((entry) => {
			if (typeof entry !== 'string') throw new Error('Permission must be a string');
			return parsePermission(entry);
		}),
		nested: readList(parsed.nested, 'nested').map((entry) => parseNestedValue(entry)),
	};
}

export function parseNested(token: string): NestedSpec {
	const separator = token.indexOf(':');
	if (separator <= 0 || separator === token.length - 1) {
		throw new Error(`Nested object must be name:field:type,field:type, received ${token}`);
	}
	const name = token.slice(0, separator);
	if (!KEBAB.test(name)) throw new Error(`Nested object name must be kebab-case, received ${token}`);
	const fields = token
		.slice(separator + 1)
		.split(',')
		.filter((part) => part.length > 0)
		.map((part) => readField(part));
	return finishNested(name, fields);
}

function readField(token: string): FieldSpec {
	const separator = token.lastIndexOf(':');
	if (separator <= 0 || separator === token.length - 1) {
		throw new Error(`Field must be name:type, received ${token}`);
	}
	const name = camel(token.slice(0, separator));
	const type = token.slice(separator + 1);
	if (!CAMEL.test(name) && name !== 'id') throw new Error(`Field name must be camelCase, received ${token}`);
	if (!FIELD_TYPES.has(type as FieldType)) throw new Error(`Field type must be string, boolean, date, number, or id, received ${token}`);
	return { name, type: type as FieldType };
}

function parseNestedValue(entry: unknown): NestedSpec {
	if (typeof entry === 'string') return parseNested(entry);
	if (!isRecord(entry) || typeof entry.name !== 'string' || !Array.isArray(entry.fields)) {
		throw new Error('Nested object must be "name:field:type,..." or { "name", "fields" }');
	}
	if (!KEBAB.test(entry.name)) throw new Error(`Nested object name must be kebab-case, received ${entry.name}`);
	const name = entry.name;
	return finishNested(
		name,
		entry.fields.map((field) => parseNestedMember(field, name)),
	);
}

function parseNestedMember(entry: unknown, parent: string): NestedMember {
	if (typeof entry === 'string') return readField(entry);
	if (isRecord(entry) && Array.isArray(entry.fields)) return parseNestedValue(entry);
	if (isRecord(entry) && typeof entry.name === 'string' && typeof entry.type === 'string') return readField(`${entry.name}:${entry.type}`);
	throw new Error(`Nested object ${parent} has a field that is not "name:type" or { "name", "fields" }`);
}

function finishNested(name: string, members: NestedMember[]): NestedSpec {
	if (members.length === 0) throw new Error(`Nested object ${name} needs at least one field`);
	const identity = members.some((member) => !isNestedMember(member) && (member.name === 'id' || member.type === 'id'));
	const kept = members.filter((member) => isNestedMember(member) || (member.name !== 'id' && member.type !== 'id'));
	if (identity && kept.length === 0) throw new Error(`Nested entity ${name} needs a field besides its id`);
	const seen = new Set<string>();
	for (const member of kept) {
		const key = isNestedMember(member) ? camel(member.name) : member.name;
		if (seen.has(key)) throw new Error(`Nested object ${name} repeats ${key}`);
		seen.add(key);
	}
	return { name, kind: identity ? 'entity' : 'value', fields: kept };
}

function isNestedMember(member: NestedMember): member is NestedSpec {
	return 'fields' in member;
}

function fieldToken(entry: unknown): string {
	if (typeof entry === 'string') return entry;
	if (isRecord(entry) && Array.isArray(entry.fields)) throw new Error('A nested object belongs in nested, not fields');
	if (isRecord(entry) && typeof entry.name === 'string' && typeof entry.type === 'string') return `${entry.name}:${entry.type}`;
	throw new Error('Field must be "name:type" or { "name", "type" }');
}

function readList(value: unknown, key: string): unknown[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) throw new Error(`Fields file ${key} must be an array`);
	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function camel(value: string): string {
	return value.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}
