import { camel } from '../../names.ts';
import type { Shape } from '../../shape.ts';
import { commandFields } from '../../text.ts';

export function restHandler(input: { entity: string; action: string; actionCamel: string; contextPascal: string; entityPascal: string; mutation: boolean; scope: string; shape: Shape }): string {
	const { entity, action, actionCamel, contextPascal, entityPascal, mutation, scope, shape } = input;
	return `import type { ApplicationServices } from '${scope}/application-services';\n\nexport const ${camel(`${entity}-${action}`)} = async (applicationServices: ApplicationServices, command: { ${commandFields(shape, mutation)} }): Promise<unknown> => {\n\treturn await applicationServices.${contextPascal}.${entityPascal}.${actionCamel}(command);\n};\n`;
}
