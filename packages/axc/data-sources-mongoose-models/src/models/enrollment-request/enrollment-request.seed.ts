/** Insert enrollmentRequestSeed into the EnrollmentRequest collection. Start the application and read it back through the endpoint. Do not copy this document into a handler, a read repository, or an in-memory catalog. */
export const enrollmentRequestSeed = [
	{
		_id: '000000000000000000000101',
		schemaVersion: '1.0.0',
		version: 0,
		courseId: '000000000000000000000001',
		learnerEmail: 'seed-learner@example.org',
		justification: 'I need this course to prepare for upcoming secure development work.',
		status: 'pending',
		statusHistory: [
			{
				fromStatus: null,
				toStatus: 'pending',
				changedAt: new Date('2026-06-27T10:00:00.000Z'),
				changedBy: 'system',
				reason: null,
			},
		],
		createdAt: new Date('2026-06-27T10:00:00.000Z'),
		updatedAt: new Date('2026-06-27T10:00:00.000Z'),
	},
];
