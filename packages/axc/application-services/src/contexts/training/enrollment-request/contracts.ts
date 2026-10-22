export interface EnrollmentResult {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: 'pending' | 'approved' | 'rejected' | 'cancelled';
	createdAt: string;
	updatedAt: string;
	statusHistory: ReadonlyArray<{ fromStatus: string | null; toStatus: string; changedAt: string; changedBy: string; reason: string | null }>;
}
export const toEnrollmentResult = (value: EnrollmentResult): EnrollmentResult => ({
	id: value.id,
	courseId: value.courseId,
	learnerEmail: value.learnerEmail,
	justification: value.justification,
	status: value.status,
	createdAt: value.createdAt,
	updatedAt: value.updatedAt,
	statusHistory: value.statusHistory.map((entry) => ({ ...entry })),
});
