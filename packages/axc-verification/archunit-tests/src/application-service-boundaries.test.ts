import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contextsRoot = path.resolve(packageDir, '../../axc/application-services/src/contexts');

async function sourceFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => sourceFiles(path.join(directory, entry.name))));
	return [...entries.filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')).map((entry) => path.join(directory, entry.name)), ...nested.flat()];
}

function parsed(file: string, source: string): ts.SourceFile {
	return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
}

function methodFile(name: string): string {
	return `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}.ts`;
}

describe('Cellix application-service boundaries', () => {
	it('uses persistence only for DataSources inside entity services', async () => {
		const violations: string[] = [];
		for (const file of await sourceFiles(contextsRoot)) {
			const relative = path.relative(contextsRoot, file);
			if (relative.split(path.sep).length !== 3) continue;
			const source = parsed(file, await readFile(file, 'utf8'));
			for (const node of source.statements) {
				if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === '@axc/persistence') {
					violations.push(`${relative}: application contracts must not re-export persistence types`);
				}
				if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== '@axc/persistence') continue;
				const clause = node.importClause;
				const names = clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements.map((element) => element.propertyName?.text ?? element.name.text) : [];
				if (clause?.name || names.some((name) => name !== 'DataSources') || names.length === 0) violations.push(`${relative}: application contracts must not import persistence types other than DataSources`);
			}
		}
		expect(violations).toStrictEqual([]);
	});

	it('places each public entity operation in its own curried module', async () => {
		const violations: string[] = [];
		for (const file of (await sourceFiles(contextsRoot)).filter((candidate) => path.basename(candidate) === 'index.ts' && path.relative(contextsRoot, candidate).split(path.sep).length === 3)) {
			const sourceText = await readFile(file, 'utf8');
			const source = parsed(file, sourceText);
			for (const statement of source.statements) {
				if (!ts.isInterfaceDeclaration(statement) || !statement.name.text.endsWith('ApplicationService')) continue;
				for (const member of statement.members) {
					if (!ts.isMethodSignature(member) && !ts.isPropertySignature(member)) continue;
					const name = member.name?.getText(source);
					if (!name) continue;
					const operation = path.join(path.dirname(file), methodFile(name));
					try {
						const operationSource = await readFile(operation, 'utf8');
						if (!operationSource.includes('dataSources: DataSources')) violations.push(`${path.relative(contextsRoot, operation)}: operation must inject DataSources before its input`);
						if (!new RegExp(`\\b${name}\\s*:\\s*${name}\\s*\\(\\s*dataSources\\s*\\)`).test(sourceText)) violations.push(`${path.relative(contextsRoot, file)}: ${name} must be composed from its operation file`);
					} catch {
						violations.push(`${path.relative(contextsRoot, file)}: ${name} needs ${methodFile(name)}`);
					}
				}
			}
		}
		expect(violations).toStrictEqual([]);
	});

	it('keeps HTTP status mapping out of application services', async () => {
		const violations: string[] = [];
		for (const file of await sourceFiles(contextsRoot)) {
			const source = await readFile(file, 'utf8');
			if (/new\s+\w*Error\s*\(\s*[45]\d\d\b/.test(source) || /\b(?:httpStatus|statusCode)\s*:\s*number\b/.test(source) || (path.basename(file) === 'errors.ts' && /\bstatus\s*:\s*number\b/.test(source))) {
				violations.push(path.relative(contextsRoot, file));
			}
		}
		expect(violations).toStrictEqual([]);
	});
});
