import { pascal } from '../../names.ts';
import { isShapeNested, type ShapeField, type ShapeNested } from '../../shape.ts';
import { propLines } from '../../text.ts';
import { childImport, entityReference, nestedMembers, scalarMembers, valueObjectImport } from './members.ts';

export function nestedEntity(item: ShapeNested, context: string, permission: string): string {
	const visa = `${pascal(context)}Visa`;
	const childEntities = item.fields.filter((member): member is ShapeNested => isShapeNested(member) && member.kind === 'entity');
	const reference = childEntities.length === 0 ? `export interface ${item.pascal}EntityReference extends Readonly<${item.pascal}Props> {}` : entityReference(item.pascal, childEntities);
	const imports = [valueObjectImport(item), ...item.fields.filter(isShapeNested).map((child) => childImport(child))].filter((line) => line.length > 0).join('\n');
	const members = [
		...item.fields.filter((member): member is ShapeField => !isShapeNested(member)).map((field) => scalarMembers(field, permission)),
		...item.fields.filter(isShapeNested).map((child) => nestedMembers(child, permission)),
	].join('\n\n');
	return `import { DomainEntity, type DomainEntityProps, PermissionError } from '@cellix/domain-seedwork/domain-entity';
import type { ${visa} } from '../${context}.visa.ts';
${imports}

export interface ${item.pascal}Props extends DomainEntityProps {
${propLines(item.fields)}
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

${reference}

export class ${item.pascal} extends DomainEntity<${item.pascal}Props> implements ${item.pascal}EntityReference {
	private isNew: boolean = false;
	private readonly visa: ${visa};
	constructor(props: ${item.pascal}Props, visa: ${visa}) {
		super(props);
		this.visa = visa;
	}

${members}

	get createdAt(): Date {
		return this.props.createdAt;
	}
	get updatedAt(): Date {
		return this.props.updatedAt;
	}
}
`;
}
