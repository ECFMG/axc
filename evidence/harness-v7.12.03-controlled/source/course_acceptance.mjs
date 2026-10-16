// Independent Task Set A oracle. Freeze outside the agent's writable checkout.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = process.cwd();
let child;
let request;
const checks = [];
const test = async (name, fn) => {
  try { await fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
};

try {
  if (process.argv.includes('--host')) {
    const socket = createServer();
    await new Promise((ok) => socket.listen(0, '127.0.0.1', ok));
    const port = socket.address().port;
    await new Promise((ok) => socket.close(ok));
    child = spawn(process.execPath, ['--experimental-strip-types', 'scripts/start-host.ts'], {
      cwd: resolve(repo, 'apps/api'), detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    });
    let tail = '';
    const capture = (data) => { tail = (tail + data.toString()).slice(-10000); };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    request = (query = '') => fetch(`http://127.0.0.1:${port}/api/courses${query ? '?' + query : ''}`, { signal: AbortSignal.timeout(10000) });
    let ready = false;
    for (let i = 0; i < 180; i++) {
      if (child.exitCode !== null) throw new Error('Host exited: ' + tail);
      try {
        const health = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) });
        if (health.status === 200) { ready = true; break; }
      } catch { /* The host is still starting. */ }
      await new Promise((ok) => setTimeout(ok, 500));
    }
    if (!ready) throw new Error('Host did not become ready: ' + tail);
  } else {
    const { createRestApp } = await import(pathToFileURL(resolve(repo, 'packages/axc/rest/dist/index.js')));
    const { buildApplicationServicesFactory } = await import(pathToFileURL(resolve(repo, 'packages/axc/application-services/dist/index.js')));
    const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
    request = (query = '') => app.request('/api/courses' + (query ? '?' + query : ''));
  }
  const page = async (query = '') => {
    const response = await request(query);
    assert.equal(response.status, 200, 'Expected successful course endpoint');
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    return response.json();
  };
  const ids = (items) => items.map((item) => item.id).sort();
  const all = [];
  const first = await page('pageSize=50');
  assert.ok(Number.isSafeInteger(first.totalPages) && first.totalPages > 0 && first.totalPages <= 100, 'Invalid catalog page count');
  all.push(...first.items);
  for (let p = 2; p <= first.totalPages; p++) all.push(...(await page(`page=${p}&pageSize=50`)).items);
  await test('model, twelve fixtures, unique IDs and mixed values', () => {
    assert.ok(all.length >= 12); assert.equal(all.length, first.totalItems);
    assert.equal(new Set(all.map((c) => c.id)).size, all.length);
    for (const c of all) {
      for (const key of ['id', 'title', 'summary', 'createdAt', 'updatedAt']) assert.equal(typeof c[key], 'string');
      assert.ok(c.id && c.title && c.summary);
      assert.ok(['online', 'in-person', 'hybrid'].includes(c.modality));
      assert.ok(['draft', 'active', 'retired'].includes(c.status));
      assert.ok(Array.isArray(c.tags) && c.tags.every((tag) => typeof tag === 'string'));
      for (const key of ['createdAt', 'updatedAt']) assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(c[key]) && Number.isFinite(Date.parse(c[key])));
    }
    assert.equal(new Set(all.map((c) => c.modality)).size, 3);
    assert.equal(new Set(all.map((c) => c.status)).size, 3);
  });
  await test('defaults and metadata', async () => {
    const result = await page();
    assert.equal(result.page, 1); assert.equal(result.pageSize, 10);
    assert.equal(result.items.length, Math.min(10, all.length));
    assert.equal(result.totalItems, all.length); assert.equal(result.totalPages, Math.ceil(all.length / 10));
    assert.deepEqual(result.items.map((c) => c.title.toLowerCase()), [...result.items.map((c) => c.title.toLowerCase())].sort());
  });
  for (const field of ['title', 'summary', 'tags']) {
    await test(`case-insensitive keyword: ${field}`, async () => {
      const candidates = all.flatMap((c) => field === 'tags' ? c.tags : [c[field]]);
      const value = candidates.find((term) => all.some((c) => {
        const target = field === 'tags' ? c.tags : [c[field]];
        const other = ['title', 'summary', 'tags'].filter((key) => key !== field).flatMap((key) => key === 'tags' ? c.tags : [c[key]]);
        return target.some((v) => v.toLowerCase().includes(term.toLowerCase())) && !other.some((v) => v.toLowerCase().includes(term.toLowerCase()));
      }));
      assert.ok(value, 'Missing search fixture');
      const term = value.toUpperCase();
      const expected = all.filter((c) => [c.title, c.summary, ...c.tags].some((v) => v.toLowerCase().includes(term.toLowerCase())));
      const result = await page('pageSize=50&q=' + encodeURIComponent(term));
      assert.deepEqual(ids(result.items), ids(expected.slice(0, 50)));
      assert.equal(result.totalItems, expected.length);
    });
  }
  for (const [field, values] of [['modality', ['online', 'in-person', 'hybrid']], ['status', ['draft', 'active', 'retired']]]) {
    for (const value of values) await test(`${field}=${value}`, async () => {
      const expected = all.filter((c) => c[field] === value);
      const result = await page(`pageSize=50&${field}=${value}`);
      assert.ok(result.items.length > 0); assert.equal(result.totalItems, expected.length);
      assert.deepEqual(ids(result.items), ids(expected.slice(0, 50)));
    });
  }
  await test('positive case-insensitive AI tag', async () => {
    const expected = all.filter((c) => c.tags.some((tag) => tag.toLowerCase() === 'ai'));
    assert.ok(expected.length > 0, 'Task Set A positive AI tag fixture missing');
    assert.deepEqual(ids((await page('tag=AI&pageSize=50')).items), ids(expected.slice(0, 50)));
  });
  for (const query of ['q=security&modality=online&status=active', 'modality=hybrid&status=draft&tag=ai']) {
    await test('AND combination: ' + query, async () => {
      const p = new URLSearchParams(query);
      const expected = all.filter((c) => (!p.has('modality') || c.modality === p.get('modality')) && (!p.has('status') || c.status === p.get('status')) && (!p.has('tag') || c.tags.some((t) => t.toLowerCase() === p.get('tag'))) && (!p.has('q') || [c.title, c.summary, ...c.tags].some((v) => v.toLowerCase().includes(p.get('q')))));
      const result = await page(query + '&pageSize=50');
      assert.deepEqual(ids(result.items), ids(expected.slice(0, 50))); assert.equal(result.totalItems, expected.length);
    });
  }
  await test('pagination, boundary and no duplicates', async () => {
    const pages = await Promise.all([1, 2, 3].map((n) => page(`page=${n}&pageSize=5`)));
    assert.deepEqual(pages.map((p) => p.page), [1, 2, 3]);
    assert.ok(pages.every((p) => p.pageSize === 5 && p.totalItems === all.length && p.totalPages === Math.ceil(all.length / 5)));
    assert.deepEqual(pages.flatMap((p) => p.items).map((c) => c.id), all.slice(0, 15).map((c) => c.id));
    assert.equal((await page('page=999999&pageSize=50')).items.length, 0);
    assert.equal((await page('pageSize=1')).items.length, 1);
  });
  for (const field of ['title', 'createdAt', 'updatedAt']) await test('ascending sort: ' + field, async () => {
    const result = await page(`sort=${field}&pageSize=50`);
    const values = result.items.map((c) => c[field].toLowerCase());
    assert.deepEqual(values, [...values].sort());
  });
  for (const query of ['modality=invalid', 'status=invalid', 'sort=invalid', 'page=0', 'page=-1', 'page=1.5', 'page=bad', 'pageSize=0', 'pageSize=51', 'pageSize=bad']) await test('invalid: ' + query, async () => {
    const response = await request(query); assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
    assert.equal(body.error.message, 'One or more query parameters are invalid.');
    assert.ok(Array.isArray(body.error.details) && body.error.details.some((d) => d.field === query.split('=')[0] && typeof d.message === 'string'));
    if (query === 'pageSize=51') assert.ok(body.error.details.some((d) => d.message === 'pageSize must be between 1 and 50.'));
  });
  await test('no matches', async () => assert.deepEqual(await page('q=__no_such_course_7391__'), { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
} catch (error) {
  checks.push({ name: 'endpoint/setup', passed: false, error: error.message });
} finally {
  if (child?.pid) {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Host already stopped. */ }
  }
}
const report = { kind: process.argv.includes('--host') ? 'azure-http' : 'hono-in-memory', checks, passed: checks.length >= 29 && checks.every((c) => c.passed) };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
