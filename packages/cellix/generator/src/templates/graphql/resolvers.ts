import { camel } from '../../names.ts';

export function resolvers(entity: string, entityPascal: string, contextPascal: string, actionCamel: string, operation: string): string {
	return `import type { Resolvers } from '../builder/generated.ts';\nimport type { GraphContext } from '../context.ts';\n\nconst ${camel(entity)}Resolvers: Resolvers = {\n\t${operation}: {\n\t\t${actionCamel}: async (_parent, args, context: GraphContext) => {\n\t\t\treturn await context.applicationServices.${contextPascal}.${entityPascal}.${actionCamel}(args.input);\n\t\t},\n\t},\n};\n\nexport default ${camel(entity)}Resolvers;\n`;
}
