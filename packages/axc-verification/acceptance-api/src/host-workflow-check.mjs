import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const socket = createServer();
await new Promise((ok) => socket.listen(0, '127.0.0.1', ok));
const port = socket.address().port;
await new Promise((ok) => socket.close(ok));
const host = spawn(process.execPath, ['--experimental-strip-types', 'scripts/start-host.ts'], {
	cwd: resolve(repo, 'apps/api'),
	env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
	detached: true,
	stdio: ['ignore', 'pipe', 'pipe'],
});
let tail = '';
const capture = (chunk) => {
	tail = (tail + chunk.toString()).slice(-16000);
};
host.stdout.on('data', capture);
host.stderr.on('data', capture);
try {
	let ready = false;
	for (let i = 0; i < 120; i++) {
		if (host.exitCode !== null) throw new Error(`Host exited: ${tail}`);
		try {
			const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) });
			if (response.ok) {
				ready = true;
				break;
			}
		} catch {
			/* The host is still starting or has already stopped. */
		}
		await new Promise((ok) => setTimeout(ok, 500));
	}
	if (!ready) throw new Error(`Host startup timeout: ${tail}`);
	console.log(`Azure Functions host ready; exercising full enrollment workflow over HTTP.`);
	const tests = spawn(process.execPath, ['--test', 'src/enrollment-requests.test.mjs'], {
		cwd: resolve(repo, 'packages/axc-verification/acceptance-api'),
		env: { ...process.env, COURSE_TEST_BASE_URL: `http://127.0.0.1:${port}` },
		stdio: 'inherit',
	});
	const code = await new Promise((ok) => tests.on('exit', ok));
	if (code !== 0) {
		console.log(tail);
		process.exitCode = 1;
	}
} finally {
	try {
		process.kill(-host.pid, 'SIGTERM');
	} catch {
		/* The host is still starting or has already stopped. */
	}
}
