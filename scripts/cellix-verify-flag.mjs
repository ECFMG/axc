import { checkFlag } from '../packages/cellix/guardrails/src/verify-flag.mjs';

const ok = checkFlag(process.cwd());
process.stdout.write(ok ? 'CELLIX_VERIFY=pass\n' : 'CELLIX_VERIFY=stale\n');
process.exit(ok ? 0 : 1);
