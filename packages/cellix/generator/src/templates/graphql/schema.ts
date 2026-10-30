import { isShapeNested, type Shape, type ShapeField, type ShapeNested } from '../../shape.ts';
import { gqlType } from '../../text.ts';

export function schema(input: { entityPascal: string; actionPascal: string; actionCamel: string; fieldName?: string; operation: string; shape: Shape; inputs?: ShapeField[] }): string {
	const { entityPascal, actionPascal, actionCamel, operation, shape, inputs } = input;
	const fieldName = input.fieldName ?? actionCamel;
	const resultName = operation === 'Query' ? `${entityPascal}${actionPascal}Result` : `${entityPascal}${actionPascal}MutationResult`;
	if (inputs) {
		const lines = inputs.map((field) => `\t${field.name}: ${field.name === 'id' ? 'ID!' : gqlType(field.type)}`).join('\n');
		const typeName = operation === 'Query' ? 'Query' : 'Mutation';
		return `input ${entityPascal}${actionPascal}Input {\n${lines}\n}\n\ntype ${resultName} {\n\tid: ID!\n}\n\nextend type ${typeName} {\n\t${fieldName}(input: ${entityPascal}${actionPascal}Input): ${resultName}!\n}\n`;
	}
	const result = `type ${resultName} {\n\tid: ID!\n}\n`;
	if (operation === 'Query') {
		return `input ${entityPascal}${actionPascal}Input {\n\tid: ID!\n}\n\n${result}\nextend type Query {\n\t${fieldName}(input: ${entityPascal}${actionPascal}Input): ${resultName}!\n}\n`;
	}
	const nestedInputs = graphqlNestedInputs(entityPascal, shape.nested);
	const fields = [...shape.fields.map((field) => `\t${field.name}: ${gqlType(field.type)}`), ...shape.nested.map((item) => `\t${item.camel}: ${entityPascal}${item.pascal}Input!`)].join('\n');
	const prefix = nestedInputs.length > 0 ? `${nestedInputs}\n\n` : '';
	return `${prefix}input ${entityPascal}${actionPascal}Input {\n${fields}\n}\n\n${result}\nextend type Mutation {\n\t${fieldName}(input: ${entityPascal}${actionPascal}Input): ${resultName}!\n}\n`;
}

function graphqlNestedInputs(entityPascal: string, items: ShapeNested[]): string {
	return items
		.flatMap((item) => {
			const fields = item.fields.map((member) => (isShapeNested(member) ? `\t${member.camel}: ${entityPascal}${member.pascal}Input!` : `\t${member.name}: ${gqlType(member.type)}`));
			const self = `input ${entityPascal}${item.pascal}Input {\n${fields.join('\n')}\n}`;
			return [graphqlNestedInputs(entityPascal, item.fields.filter(isShapeNested)), self];
		})
		.filter((part) => part.length > 0)
		.join('\n\n');
}
