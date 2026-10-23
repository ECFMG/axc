import type { Shape } from '../../shape.ts';
import { commandFields, namespacePath } from '../../text.ts';

export function action(input: { actionCamel: string; command: string; contextPascal: string; entityPascal: string; mutation: boolean; scope: string; shape: Shape }): string {
	const { actionCamel, command, contextPascal, entityPascal, mutation, scope, shape } = input;
	const inputLiteral = [...shape.fields.map((field) => `${field.name}: command.${field.name}`), ...shape.nested.map((item) => `${item.camel}: command.${item.camel}`)].join(', ');
	const domainPath = namespacePath(contextPascal, entityPascal);
	const body = mutation
		? `return await dataSources.domainDataSource.${domainPath}UnitOfWork.withScopedTransaction(async (repo) => {\n\t\t\treturn repo.save(await repo.getNewInstance({ ${inputLiteral} }));\n\t\t});`
		: `const found = await dataSources.readonlyDataSource.${contextPascal}.${entityPascal}.${entityPascal}ReadRepo.getById(command.id);\n\t\tif (!found) {\n\t\t\tthrow new Error('${entityPascal} was not found');\n\t\t}\n\t\treturn found;`;
	const result = `Domain.Contexts.${domainPath}EntityReference`;
	return `import type { Domain } from '${scope}/domain';\nimport type { DataSources } from '${scope}/persistence';\n\nexport interface ${command} {\n\t${commandFields(shape, mutation)}\n}\n\nexport const ${actionCamel} = (dataSources: DataSources) => {\n\treturn async (command: ${command}): Promise<${result}> => {\n\t\t${body}\n\t};\n};\n`;
}

export function entityServiceIndex(action: string, actionCamel: string, command: string, contextPascal: string, entityPascal: string, scope: string): string {
	return `import type { Domain } from '${scope}/domain';\nimport type { DataSources } from '${scope}/persistence';\nimport { type ${command}, ${actionCamel} } from './${action}.ts';\n\nexport interface ${entityPascal}ApplicationService {\n\t${actionCamel}: (command: ${command}) => Promise<Domain.Contexts.${contextPascal}.${entityPascal}.${entityPascal}EntityReference>;\n}\n\nexport const ${entityPascal} = (dataSources: DataSources): ${entityPascal}ApplicationService => {\n\treturn {\n\t\t${actionCamel}: ${actionCamel}(dataSources),\n\t};\n};\n`;
}
