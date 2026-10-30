export function repository(entity: string, entityPascal: string): string {
	return `import type { Repository } from '@cellix/domain-seedwork/repository';\nimport type { ${entityPascal}, ${entityPascal}NewInput, ${entityPascal}Props } from './${entity}.aggregate.ts';\n\nexport interface ${entityPascal}Repository<props extends ${entityPascal}Props> extends Repository<${entityPascal}<props>> {\n\tgetNewInstance(input: ${entityPascal}NewInput): Promise<${entityPascal}<props>>;\n\tgetById(id: string): Promise<${entityPascal}<props>>;\n}\n`;
}
