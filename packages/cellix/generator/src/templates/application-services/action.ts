import type { Shape, ShapeField, ShapeNested } from '../../shape.ts';
import { type ActionKind, commandFields, namespacePath } from '../../text.ts';

export function action(input: {
	actionCamel: string;
	command: string;
	contextPascal: string;
	entityPascal: string;
	kind: ActionKind;
	result: string;
	scope: string;
	shape: Shape;
	commandShape?: { fields: ShapeField[]; nested: ShapeNested[] };
}): string {
	const { actionCamel, command, contextPascal, entityPascal, kind, result, scope, shape } = input;
	const commandSource = input.commandShape ?? shape;
	const inputLiteral = [...shape.fields.map((field) => `${field.name}: command.${field.name}`), ...shape.nested.map((item) => `${item.camel}: command.${item.camel}`)].join(', ');
	const domainPath = namespacePath(contextPascal, entityPascal);
	const reference = `Domain.Contexts.${domainPath}EntityReference`;
	const transaction = `dataSources.domainDataSource.${domainPath}UnitOfWork.withScopedTransaction`;
	const body =
		kind === 'read'
			? `return await dataSources.readonlyDataSource.${contextPascal}.${entityPascal}.${entityPascal}ReadRepo.${actionCamel}(command);`
			: kind === 'update'
				? `let updated: ${reference} | undefined;\n\t\tawait ${transaction}(async (repo) => {\n\t\t\tconst current = await repo.getById(command.id);\n\t\t\tif (!current) {\n\t\t\t\tthrow new Error('Unable to update ${entityPascal}');\n\t\t\t}\n\t\t\t// assign the command onto current\n\t\t\tupdated = await repo.save(current);\n\t\t});\n\t\tif (!updated) {\n\t\t\tthrow new Error('Unable to update ${entityPascal}');\n\t\t}\n\t\treturn updated;`
				: `return await ${transaction}(async (repo) => {\n\t\t\treturn repo.save(await repo.getNewInstance({ ${inputLiteral} }));\n\t\t});`;
	return `import type { Domain } from '${scope}/domain';\nimport type { DataSources } from '${scope}/persistence';\n\nexport interface ${command} {\n\t${commandFields(commandSource, kind)}\n}\n\nexport const ${actionCamel} = (dataSources: DataSources) => {\n\treturn async (command: ${command}): Promise<${result}> => {\n\t\t${body}\n\t};\n};\n`;
}

export function entityServiceIndex(action: string, actionCamel: string, command: string, _contextPascal: string, entityPascal: string, result: string, scope: string): string {
	return `import type { Domain } from '${scope}/domain';\nimport type { DataSources } from '${scope}/persistence';\nimport { type ${command}, ${actionCamel} } from './${action}.ts';\n\nexport interface ${entityPascal}ApplicationService {\n\t${actionCamel}: (command: ${command}) => Promise<${result}>;\n}\n\nexport const ${entityPascal} = (dataSources: DataSources): ${entityPascal}ApplicationService => {\n\treturn {\n\t\t${actionCamel}: ${actionCamel}(dataSources),\n\t};\n};\n`;
}
