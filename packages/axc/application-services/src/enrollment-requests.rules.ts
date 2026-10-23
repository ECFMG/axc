import type { EnrollmentStatus } from './enrollment-requests.ts';

export const JUSTIFICATION_MIN = 20;
export const JUSTIFICATION_MAX = 500;

const transitions: Readonly<Record<EnrollmentStatus, readonly EnrollmentStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export const canTransitionEnrollmentStatus = (from: EnrollmentStatus, to: EnrollmentStatus): boolean => transitions[from].includes(to);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidLearnerEmail = (value: unknown): value is string => typeof value === 'string' && emailPattern.test(value.trim());

export const normalizeLearnerEmail = (value: string): string => value.trim().toLowerCase();

export const isValidJustification = (value: unknown): value is string => typeof value === 'string' && value.length >= JUSTIFICATION_MIN && value.length <= JUSTIFICATION_MAX;
