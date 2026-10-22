import { describe, expect, it } from 'vitest';
import { readRepoFile, readSourceFiles } from './support/workspace.ts';

// Documentation fitness: the API pages in apps/docs must describe every route @axc/rest serves for
// courses and enrollment requests, their request/response fields, and every error code.

function doc(relativePath: string): string {
	const file = readRepoFile(relativePath);
	if (!file) {
		throw new Error(`${relativePath} is missing`);
	}
	return file.content;
}

const coursesDoc = () => doc('apps/docs/docs/api/courses.md');
const enrollmentDoc = () => doc('apps/docs/docs/api/enrollment-requests.md');

const missingFrom = (content: string, terms: readonly string[]) => terms.filter((term) => !content.includes(term));

describe('API documentation', () => {
	it('B-AC15 documents every enrollment request route that @axc/rest serves', () => {
		const rest = readSourceFiles('packages/axc/rest/src').find((file) => file.path.endsWith('/enrollment-requests.ts'));
		const routes = [...(rest?.content ?? '').matchAll(/app\.(get|post|patch)\('([^']+)'/g)].map((match) => `\`${(match[1] ?? '').toUpperCase()}\` | \`${(match[2] ?? '').replace(/:(\w+)/g, '{$1}')}\``);

		expect(routes).toHaveLength(4);
		expect(missingFrom(enrollmentDoc(), routes)).toStrictEqual([]);
	});

	it('B-AC15 documents enrollment request bodies, response fields, and status history', () => {
		const terms = [
			'`courseId`',
			'`learnerEmail`',
			'`justification`',
			'`status`',
			'`changedBy`',
			'`reason`',
			'`statusHistory`',
			'`fromStatus`',
			'`toStatus`',
			'`changedAt`',
			'`createdAt`',
			'`updatedAt`',
			'"status": "pending"',
			'201',
		];
		expect(missingFrom(enrollmentDoc(), terms)).toStrictEqual([]);
	});

	it('B-AC15 documents every enrollment error code from the requirements', () => {
		const requirements = doc('task-set-b-requirements.md');
		const codes = [...new Set([...requirements.matchAll(/\| \d{3} \| `([A-Z_]+)` \|/g)].map((match) => match[1] ?? ''))];

		expect(codes).toStrictEqual(['COURSE_NOT_FOUND', 'COURSE_NOT_ACTIVE', 'INVALID_REQUEST', 'DUPLICATE_ACTIVE_REQUEST', 'ENROLLMENT_REQUEST_NOT_FOUND', 'INVALID_STATUS_TRANSITION']);
		expect(missingFrom(enrollmentDoc(), codes)).toStrictEqual([]);
	});

	it('B-AC1 B-AC15 documents course search parameters, response, and errors', () => {
		const terms = ['GET /api/courses', '`q`', '`modality`', '`status`', '`tag`', '`page`', '`pageSize`', '`sort`', '"totalPages"', 'INVALID_QUERY_PARAMETER'];
		expect(missingFrom(coursesDoc(), terms)).toStrictEqual([]);
	});

	it('B-AC15 lists both API pages in the docs sidebar', () => {
		expect(missingFrom(doc('apps/docs/sidebars.ts'), ["'api/courses'", "'api/enrollment-requests'"])).toStrictEqual([]);
	});
});
