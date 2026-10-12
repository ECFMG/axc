/** In-memory adapter for the {@link EnrollmentRequestRepository} port. */

import { type EnrollmentRequest, type EnrollmentRequestFilters, type EnrollmentRequestRepository, isActiveEnrollmentStatus, normalizeEmail } from '@axc/domain';

/** Width of the numeric suffix in generated enrollment request identifiers. */
const IDENTIFIER_DIGITS = 3;

/**
 * Builds an enrollment request repository backed by an insertion-ordered in-memory map.
 *
 * @remarks
 * Identifiers are allocated per repository instance (`enroll-001`, `enroll-002`, …) so unit tests
 * stay deterministic and independent. `findByFilters` returns the most recently created request
 * first, which is insertion order reversed.
 */
export function createInMemoryEnrollmentRequestRepository(seed: readonly EnrollmentRequest[] = []): EnrollmentRequestRepository {
	const store = new Map<string, EnrollmentRequest>(seed.map((request) => [request.id, request]));
	let sequence = store.size;

	return {
		nextIdentity(): Promise<string> {
			sequence += 1;
			return Promise.resolve(`enroll-${String(sequence).padStart(IDENTIFIER_DIGITS, '0')}`);
		},
		save(request: EnrollmentRequest): Promise<EnrollmentRequest> {
			store.set(request.id, request);
			return Promise.resolve(request);
		},
		findById(id: string): Promise<EnrollmentRequest | undefined> {
			return Promise.resolve(store.get(id));
		},
		findByFilters(filters: EnrollmentRequestFilters): Promise<readonly EnrollmentRequest[]> {
			const matches = [...store.values()].filter((request) => matchesFilters(request, filters)).reverse();
			return Promise.resolve(matches);
		},
		findActiveForLearner(courseId: string, learnerEmail: string): Promise<EnrollmentRequest | undefined> {
			const normalized = normalizeEmail(learnerEmail);
			const match = [...store.values()].find((request) => request.courseId === courseId && normalizeEmail(request.learnerEmail) === normalized && isActiveEnrollmentStatus(request.status));
			return Promise.resolve(match);
		},
	};
}

function matchesFilters(request: EnrollmentRequest, filters: EnrollmentRequestFilters): boolean {
	if (filters.status !== undefined && request.status !== filters.status) {
		return false;
	}
	if (filters.courseId !== undefined && request.courseId !== filters.courseId) {
		return false;
	}
	if (filters.learnerEmail !== undefined && normalizeEmail(request.learnerEmail) !== filters.learnerEmail) {
		return false;
	}
	return true;
}
