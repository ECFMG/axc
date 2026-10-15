// Syntax and named-export preservation using the repository's installed TypeScript.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const target = path.resolve(input.repo, input.path);
let directory = path.dirname(target);
let ts;
while (directory.startsWith(path.resolve(input.repo))) {
  const manifest = path.join(directory, 'package.json');
  if (fs.existsSync(manifest)) {
    try { ts = createRequire(manifest)('typescript'); break; } catch { /* Try parent. */ }
  }
  const parent = path.dirname(directory);
  if (parent === directory) break;
  directory = parent;
}
if (!ts) throw new Error('Installed TypeScript parser is required for source contract checks; restore locked repository dependencies.');
const parse = (text) => ts.createSourceFile(target, text, ts.ScriptTarget.Latest, true);
const proposed = parse(input.content);
if (proposed.parseDiagnostics.length) throw new Error(ts.flattenDiagnosticMessageText(proposed.parseDiagnostics[0].messageText, '\n'));
const exportsOf = (file) => {
  const names = new Set();
  for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) names.add(element.name.text);
      } else if (!statement.exportClause && statement.moduleSpecifier) names.add('*:' + statement.moduleSpecifier.text);
    }
    const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (exported) {
      if (statement.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) names.add('default');
      else if (statement.name) names.add(statement.name.text);
      else if (ts.isVariableStatement(statement)) {
        const collect = (node) => {
          if (ts.isIdentifier(node)) names.add(node.text);
          else for (const element of node.elements ?? []) if (element.name) collect(element.name);
        };
        for (const declaration of statement.declarationList.declarations) collect(declaration.name);
      }
    }
  }
  return names;
};
const missing = [...exportsOf(parse(input.original))].filter((name) => !exportsOf(proposed).has(name));
if (missing.length) throw new Error('Preserve original public exports: ' + missing.join(', '));
for (const statement of proposed.statements) {
  if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier) continue;
  const name = statement.moduleSpecifier.text;
  if (name.startsWith('.') && path.resolve(path.dirname(target), name).replace(/\.js$/, '.ts') === target) {
    throw new Error('Self-import is forbidden: ' + name);
  }
  if (name.startsWith('@axc/')) {
    const parts = name.split('/');
    const manifest = JSON.parse(fs.readFileSync(path.join(input.repo, 'packages/axc', parts[1], 'package.json'), 'utf8'));
    const subpath = parts.length === 2 ? '.' : './' + parts.slice(2).join('/');
    if (!Object.hasOwn(manifest.exports ?? {}, subpath)) throw new Error('Import is not a public package export: ' + name);
  }
}
console.log(JSON.stringify({ passed: true }));
