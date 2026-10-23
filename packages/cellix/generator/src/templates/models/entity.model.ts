import { isShapeNested, type Shape, type ShapeNested } from '../../shape.ts';
import { mongooseField, tsType } from '../../text.ts';

export function model(entityPascal: string, shape: Shape): string {
	const nestedTypes = modelInterfaces(entityPascal, shape.nested);
	const fields = [...shape.fields.map((field) => `\t${field.name}: ${tsType(field.type)};`), ...shape.nested.map((item) => `\t${item.camel}: ${entityPascal}${item.pascal};`)].join('\n');
	const schemaFields = [...shape.fields.map((field) => `\t\t${field.name}: ${mongooseField(field)},`), ...shape.nested.map((item) => `\t\t${item.camel}: {\n${mongooseMembers(item, '\t\t')}\n\t\t},`)].join('\n');
	return `import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { type Model, Schema } from 'mongoose';

${nestedTypes}export interface ${entityPascal} extends MongooseSeedwork.Base {
${fields}
}

const ${entityPascal}Schema = new Schema<${entityPascal}, Model<${entityPascal}>, ${entityPascal}>(
	{
		schemaVersion: { type: String, default: '1.0.0' },
${schemaFields}
	},
	{ timestamps: true, versionKey: 'version' },
);

export const ${entityPascal}ModelName = '${entityPascal}';
export const ${entityPascal}ModelFactory = MongooseSeedwork.modelFactory<${entityPascal}>(${entityPascal}ModelName, ${entityPascal}Schema);
export type ${entityPascal}ModelType = ReturnType<typeof ${entityPascal}ModelFactory>;
`;
}

function modelInterfaces(prefix: string, items: ShapeNested[]): string {
	const text = items
		.flatMap((item) => {
			const lines = item.fields.map((member) => (isShapeNested(member) ? `\t${member.camel}: ${prefix}${member.pascal};` : `\t${member.name}: ${tsType(member.type)};`));
			const self = `export interface ${prefix}${item.pascal} {\n${lines.join('\n')}\n}`;
			return [modelInterfaces(prefix, item.fields.filter(isShapeNested)), self];
		})
		.filter((part) => part.length > 0)
		.join('\n\n');
	return text.length > 0 ? `${text}\n` : '';
}

function mongooseMembers(item: ShapeNested, indent: string): string {
	return item.fields
		.map((member) => {
			if (isShapeNested(member)) return `${indent}\t${member.camel}: {\n${mongooseMembers(member, `${indent}\t`)}\n${indent}\t},`;
			return `${indent}\t${member.name}: ${mongooseField(member)},`;
		})
		.join('\n');
}
