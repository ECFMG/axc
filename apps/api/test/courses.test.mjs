import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fetch from 'node-fetch';

// Note: These tests assume the local API is running on port 7071
// In a real CI environment, we would use a lifecycle hook to start/stop the host.
const BASE_URL = 'http://localhost:7071/api/courses';

describe('Course Catalog API Integration Tests', () => {
	test('GET /api/courses returns default paginated list', async () => {
		const res = await fetch(BASE_URL);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		assert.ok(Array.isArray(data.items));
		assert.strictEqual(data.page, 1);
		assert.strictEqual(data.pageSize, 10);
		assert.ok(typeof data.totalItems === 'number');
	});

	test('GET /api/courses with keyword search (q)', async () => {
		// Searching for 'security' which exists in fixtures
		const res = await fetch(`${BASE_URL}?q=security`);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		assert.ok(data.items.length > 0);
		data.items.forEach((item) => {
			const searchStr = `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase();
			assert.ok(searchStr.includes('security'));
		});
	});

	test('GET /api/courses with modality filter', async () => {
		const res = await fetch(`${BASE_URL}?modality=online`);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		data.items.forEach((item) => {
			assert.strictEqual(item.modality, 'online');
		});
	});

	test('GET /api/courses with status filter', async () => {
		const res = await fetch(`${BASE_URL}?status=active`);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		data.items.forEach((item) => {
			assert.strictEqual(item.status, 'active');
		});
	});

	test('GET /api/courses with tag filter', async () => {
		const res = await fetch(`${BASE_URL}?tag=ai`);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		data.items.forEach((item) => {
			assert.ok(item.tags.some((t) => t.toLowerCase() === 'ai'));
		});
	});

	test('GET /api/courses with combined filters', async () => {
		const res = await fetch(`${BASE_URL}?q=security&modality=online&status=active`);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		data.items.forEach((item) => {
			assert.strictEqual(item.modality, 'online');
			assert.strictEqual(item.status, 'active');
			const searchStr = `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase();
			assert.ok(searchStr.includes('security'));
		});
	});

	test('GET /api/courses with pagination', async () => {
		const pageSize = 5;
		const res = await fetch(`${BASE_URL}?pageSize=${pageSize}&page=1`);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		assert.strictEqual(data.pageSize, pageSize);
		assert.ok(data.items.length <= pageSize);
	});

	test('GET /api/courses with sorting', async () => {
		const res = await fetch(`${BASE_URL}?sort=createdAt`);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		const dates = data.items.map((i) => new Date(i.createdAt).getTime());
		const sortedDates = [...dates].sort((a, b) => a - b);
		assert.deepStrictEqual(dates, sortedDates);
	});

	test('GET /api/courses returns empty list for no matches', async () => {
		const res = await fetch(`${BASE_URL}?q=nonexistent_keyword_xyz`);
		assert.strictEqual(res.status, 200);
		const data = await res.json();

		assert.strictEqual(data.items.length, 0);
		assert.strictEqual(data.totalItems, 0);
	});

	test('GET /api/courses returns 400 for invalid pageSize', async () => {
		const res = await fetch(`${BASE_URL}?pageSize=100`);
		assert.strictEqual(res.status, 400);
		const data = await res.json();

		assert.strictEqual(data.error.code, 'INVALID_QUERY_PARAMETER');
		assert.ok(data.error.details.some((d) => d.field === 'pageSize'));
	});

	test('GET /api/courses returns 400 for invalid modality', async () => {
		const res = await fetch(`${BASE_URL}?modality=invalid_modality`);
		assert.strictEqual(res.status, 400);
		const data = await res.json();

		assert.strictEqual(data.error.code, 'INVALID_QUERY_PARAMETER');
		assert.ok(data.error.details.some((d) => d.field === 'modality'));
	});
});
