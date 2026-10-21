import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyApiDocument } from './check-rendered-api-docs.mjs';

test('rejects a fence with trailing prose inside a JSON example', () => {
	const markdown = '# Requests\n\n```json\n{}\n``` The course must exist.\n\n## Retrieve\n\n```';
	const html = '<h1>Requests</h1><pre>## Retrieve</pre>';
	assert.match(verifyApiDocument(markdown, html).join('\n'), /line 5: fence marker inside a code block has trailing text/);
});

test('rejects a source heading missing from the rendered page', () => {
	const markdown = '# Requests\n\n## Retrieve';
	const html = '<h1>Requests</h1>';
	assert.deepEqual(verifyApiDocument(markdown, html), ['heading "Retrieve" is missing from rendered HTML']);
});

test('accepts closed examples and rendered headings in order', () => {
	const markdown = '# Requests\n\n```json\n{}\n```\n\n## Retrieve\n\n## Change status';
	const html = '<h1>Requests</h1><h2 id="retrieve">Retrieve<a href="#retrieve">​</a></h2><h2 id="change-status">Change status</h2>';
	assert.deepEqual(verifyApiDocument(markdown, html), []);
});
