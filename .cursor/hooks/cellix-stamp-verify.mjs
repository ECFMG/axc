#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

if (process.env.npm_lifecycle_event !== 'verify') {
	process.stderr.write('The verify stamp is written only by pnpm run verify.\n');
	process.exit(1);
}

const directory = path.join(process.cwd(), '.cellix');
mkdirSync(directory, { recursive: true });
writeFileSync(path.join(directory, 'verify.json'), `${JSON.stringify({ exitCode: 0, endedAt: new Date().toISOString() })}\n`);
