import { camel, pascal } from './names.ts';
import type { FieldSpec, NestedSpec } from './spec.ts';

export interface ShapeField {
	name: string;
	pascal: string;
	type: string;
}

export interface ShapeNested {
	name: string;
	camel: string;
	pascal: string;
	kind: 'value' | 'entity';
	fields: ShapeMember[];
}

export type ShapeMember = ShapeField | ShapeNested;

export interface Shape {
	fields: ShapeField[];
	permissions: string[];
	nested: ShapeNested[];
}

export function normalizeShape(entity: string, fields: FieldSpec[], permissions: string[], nested: NestedSpec[]): Shape {
	const source = fields.length > 0 ? fields : [{ name: `${camel(entity)}Name`, type: 'string' as const }];
	const scalars: ShapeField[] = source.map((field) => {
		if (field.type === 'id') throw new Error(`${field.name}:id belongs on --nested. Root id comes from the aggregate`);
		return { name: field.name, pascal: pascal(field.name), type: field.type };
	});
	const fileNames = new Set<string>([entity]);
	const children = nested.map((item) => toShapeNested(item, fileNames));
	const seen = new Set<string>();
	for (const name of [...scalars.map((field) => field.name), ...children.map((item) => item.camel)]) {
		if (seen.has(name)) throw new Error(`Name ${name} is used more than once`);
		seen.add(name);
	}
	const resolvedPermissions = permissions.length > 0 ? permissions : [`canManage${pascal(entity)}`];
	const seenPermissions = new Set<string>();
	for (const permission of resolvedPermissions) {
		if (seenPermissions.has(permission)) throw new Error(`Permission ${permission} is used more than once`);
		seenPermissions.add(permission);
	}
	return { fields: scalars, permissions: resolvedPermissions, nested: children };
}

function toShapeNested(item: NestedSpec, fileNames: Set<string>): ShapeNested {
	if (fileNames.has(item.name)) throw new Error(`Name ${item.name} is used more than once`);
	fileNames.add(item.name);
	const fields: ShapeMember[] = item.fields.map((member) => {
		if (isNestedSpec(member)) {
			if (item.kind === 'value' && member.kind === 'entity') throw new Error(`Nested entity ${member.name} cannot sit inside value object ${item.name}`);
			return toShapeNested(member, fileNames);
		}
		if (member.type === 'id') throw new Error(`${item.name}.${member.name} was not removed as an identity field`);
		return { name: member.name, pascal: pascal(member.name), type: member.type };
	});
	return { name: item.name, camel: camel(item.name), pascal: pascal(item.name), kind: item.kind, fields };
}

function isNestedSpec(member: NestedSpec['fields'][number]): member is NestedSpec {
	return 'fields' in member;
}

export function isShapeNested(member: ShapeMember): member is ShapeNested {
	return 'kind' in member;
}
