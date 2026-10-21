// Prints "verify ok · acceptance N/N" from a green verify log (Serenity per-feature summary lines).
import { readFileSync } from 'node:fs';

let passed = 0;
let total = 0;
for (const line of readFileSync(process.argv[2] ?? 0, 'utf8').split(/\r?\n/)) {
	if (!line.includes('test:acceptance:')) continue;
	const ok = line.match(/:\s+(\d+) successful\b/);
	const all = line.match(/\b(\d+) total\b/);
	if (ok?.[1] && all?.[1]) {
		passed += Number(ok[1]);
		total += Number(all[1]);
	}
}
console.log(`verify ok · acceptance ${total ? `${passed}/${total}` : 'n/a'}`);
