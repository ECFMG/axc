import { camel, pascal } from '../../names.ts';
import type { Shape } from '../../shape.ts';
import { tsType } from '../../text.ts';
import { childImport, createdMembers, entityReference, nestedMembers, scalarMembers } from './members.ts';

export function aggregate(input: { entity: string; entityPascal: string; context: string; shape: Shape }): string {
	const { entity, entityPascal, context, shape } = input;
	const contextCamel = camel(context);
	const visa = `${pascal(context)}Visa`;
	const entityNests = shape.nested.filter((item) => item.kind === 'entity');
	const reference = entityNests.length === 0 ? `export interface ${entityPascal}EntityReference extends Readonly<${entityPascal}Props> {}` : entityReference(entityPascal, entityNests);
	const nestedImports = shape.nested.map((item) => childImport(item)).join('\n');
	const props = [
		...shape.fields.map((field) => `\t${field.name}: ${tsType(field.type)};`),
		...shape.nested.map((item) => `\t${item.camel}: ${item.pascal}Props;`),
		'\treadonly createdAt: Date;',
		'\treadonly updatedAt: Date;',
		'\treadonly schemaVersion: string;',
	].join('\n');
	const inputFields = [...shape.fields.map((field) => `\t${field.name}: ${tsType(field.type)};`), ...shape.nested.map((item) => `\t${item.camel}: ${item.pascal}Props;`)].join('\n');
	const assigns = [...shape.fields.map((field) => `\t\tnewInstance.${field.name} = input.${field.name};`), ...shape.nested.map((item) => `\t\tnewInstance.${item.camel} = input.${item.camel};`)].join('\n');
	const permission = shape.permissions[0] ?? `canManage${entityPascal}`;
	const members = [...shape.fields.map((field) => scalarMembers(field, permission)), ...shape.nested.map((item) => nestedMembers(item, permission)), createdMembers()].join('\n\n');
	return `import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import { type DomainEntityProps, PermissionError } from '@cellix/domain-seedwork/domain-entity';
import type { Passport } from '../../passport.ts';
import type { ${visa} } from '../${context}.visa.ts';
import * as ValueObjects from './${entity}.value-objects.ts';
${nestedImports}

export interface ${entityPascal}Props extends DomainEntityProps {
${props}
}

${reference}

export interface ${entityPascal}NewInput {
${inputFields}
}

export class ${entityPascal}<props extends ${entityPascal}Props> extends AggregateRoot<props, Passport> implements ${entityPascal}EntityReference {
	private isNew: boolean = false;
	private readonly visa: ${visa};
	constructor(props: props, passport: Passport) {
		super(props, passport);
		this.visa = passport.${contextCamel}.for${entityPascal}(this);
	}

	public static getNewInstance<props extends ${entityPascal}Props>(newProps: props, input: ${entityPascal}NewInput, passport: Passport): ${entityPascal}<props> {
		const newInstance = new ${entityPascal}(newProps, passport);
		newInstance.markAsNew();
${assigns}
		newInstance.isNew = false;
		return newInstance;
	}

	private markAsNew(): void {
		this.isNew = true;
	}

${members}
}
`;
}
