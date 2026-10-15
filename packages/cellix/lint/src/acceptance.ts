import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const featuresRoot = 'packages/axc-verification/acceptance-api/src/features';
const stepsRoot = 'packages/axc-verification/acceptance-api/src/step-definitions';

/** Every acceptance feature calls the running application. Steps do not keep a document array. */
export async function checkAcceptanceShape(root: string): Promise<string[]> {
	const features = await walk(path.join(root, featuresRoot), '.feature');
	const violations: string[] = [];
	for (const featurePath of features) {
		const text = await readFile(featurePath, 'utf8');
		const relative = toPosix(path.relative(root, featurePath));
		if (!text.includes('Scenario:') || !/^[\t ]*When /m.test(text) || !/^[\t ]*Then /m.test(text)) {
			violations.push(`${relative} must be one scenario that calls the running application. Include Scenario, When, and Then.`);
		}
		const stepsPath = path.join(root, stepsRoot, `${path.basename(featurePath, '.feature')}.steps.ts`);
		const stepsRelative = toPosix(path.relative(root, stepsPath));
		let steps = '';
		try {
			steps = await readFile(stepsPath, 'utf8');
		} catch {
			violations.push(`${relative} needs ${stepsRelative} to send the request to the running application.`);
			continue;
		}
		if (!steps.includes('GetRequest.to(')) {
			violations.push(`${stepsRelative} must call GetRequest.to so the scenario hits the running application.`);
		}
		if (/=\s*\[/.test(steps)) {
			violations.push(`${stepsRelative} keeps a document array. Read the row from the database through the running application.`);
		}
	}
	return violations;
}

async function walk(directory: string, extension: string): Promise<string[]> {
	let entries: Dirent[] = [];
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch {
		return [];
	}
	const files = await Promise.all(
		entries.map((entry) => {
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) return walk(entryPath, extension);
			return Promise.resolve(entry.name.endsWith(extension) ? [entryPath] : []);
		}),
	);
	return files.flat();
}

function toPosix(file: string): string {
	return file.split(path.sep).join('/');
}
