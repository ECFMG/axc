import type { Shape } from '../../shape.ts';
import { namespacePath, structuralType, tsType } from '../../text.ts';

export function domainAdapter(input: { entityPascal: string; contextPascal: string; scope: string; shape: Shape }): string {
	const { entityPascal, contextPascal, scope, shape } = input;
	const domainPath = namespacePath(contextPascal, entityPascal);
	const members = [
		...shape.fields.map(
			(field) => `	get ${field.name}(): ${tsType(field.type)} {\n\t\treturn this.doc.${field.name};\n\t}\n\tset ${field.name}(${field.name}: ${tsType(field.type)}) {\n\t\tthis.doc.${field.name} = ${field.name};\n\t}`,
		),
		...shape.nested.map((item) => {
			const type = structuralType(item);
			return `	get ${item.camel}(): ${type} {\n\t\treturn this.doc.${item.camel};\n\t}\n\tset ${item.camel}(${item.camel}: ${type}) {\n\t\tthis.doc.${item.camel} = ${item.camel};\n\t}`;
		}),
	].join('\n');
	return `import type { ${entityPascal} } from '${scope}/data-sources-mongoose-models';
import { Domain } from '${scope}/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';

export class ${entityPascal}Converter extends MongooseSeedwork.MongoTypeConverter<${entityPascal}, ${entityPascal}DomainAdapter, Domain.Passport, Domain.Contexts.${domainPath}<${entityPascal}DomainAdapter>> {
	constructor() {
		super(${entityPascal}DomainAdapter, Domain.Contexts.${domainPath});
	}
}

export class ${entityPascal}DomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<${entityPascal}> implements Domain.Contexts.${domainPath}Props {
${members}
}
`;
}
