#!/usr/bin/env node
// Writes the verify flag. The flag rules are @cellix/guardrails.
import { writeFlag } from '../../packages/cellix/guardrails/src/verify-flag.mjs';

if (process.env.npm_lifecycle_event !== 'verify') {
	process.stderr.write('The verify stamp is written only by pnpm run verify.\n');
	process.exit(1);
}

writeFlag(process.cwd());
process.stdout.write('CELLIX_VERIFY=pass\n');
