import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsRoot = fileURLToPath(new URL('../docs/api/', import.meta.url));
const buildRoot = fileURLToPath(new URL('../build/api/', import.meta.url));

function markdownFiles(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(directory, entry.name);
		return entry.isDirectory() ? markdownFiles(file) : entry.isFile() && entry.name.endsWith('.md') ? [file] : [];
	});
}

const normalized = (value) =>
	value
		.replace(/<[^>]*>/g, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/[\u200b*_`]/g, '')
		.trim();

export function verifyApiDocument(markdown, html) {
	const errors = [];
	const headings = [];
	let fence;
	for (const [index, line] of markdown.split(/\r?\n/).entries()) {
		const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
		if (marker) {
			const ticks = marker[1];
			if (!ticks) continue;
			if (!fence) fence = { character: ticks[0], length: ticks.length, line: index + 1 };
			else if (ticks[0] === fence.character && ticks.length >= fence.length) {
				if (marker[2]?.trim()) errors.push(`line ${index + 1}: fence marker inside a code block has trailing text`);
				else fence = undefined;
			}
			continue;
		}
		if (!fence) {
			const heading = /^#{1,6}[ \t]+(.+?)\s*#*\s*$/.exec(line);
			if (heading?.[1]) headings.push(normalized(heading[1]));
		}
	}
	if (fence) errors.push(`line ${fence.line}: code fence is not closed`);

	const rendered = [...html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((match) => normalized(match[1] ?? ''));
	let next = 0;
	for (const heading of headings) {
		const found = rendered.indexOf(heading, next);
		if (found < 0) errors.push(`heading "${heading}" is missing from rendered HTML`);
		else next = found + 1;
	}
	return errors;
}

function main() {
	if (!existsSync(docsRoot)) {
		console.log('No API documentation pages to verify.');
		return;
	}
	let failures = 0;
	for (const file of markdownFiles(docsRoot)) {
		const relative = path.relative(docsRoot, file).replace(/\.md$/, '');
		const htmlFile = path.join(buildRoot, relative, 'index.html');
		let html;
		try {
			html = readFileSync(htmlFile, 'utf8');
		} catch {
			console.error(`${relative}: rendered page is missing at ${htmlFile}`);
			failures++;
			continue;
		}
		for (const error of verifyApiDocument(readFileSync(file, 'utf8'), html)) {
			console.error(`${relative}: ${error}`);
			failures++;
		}
	}
	if (failures) process.exitCode = 1;
	else console.log('API documentation fences and rendered headings verified.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
