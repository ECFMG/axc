import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { EnrollmentRequestDocument } from '../../../../models/index.ts';
export class EnrollmentRequestDomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<EnrollmentRequestDocument> {
	toDomain(): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest {
		const doc = this.doc;
		return new Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest(
			{
				id: doc.requestId,
				courseId: doc.courseId,
				learnerEmail: doc.learnerEmail,
				justification: doc.justification,
				status: doc.status,
				createdAt: doc.createdAt.toISOString(),
				updatedAt: doc.updatedAt.toISOString(),
				statusHistory: doc.statusHistory.map((entry) => ({ fromStatus: entry.fromStatus, toStatus: entry.toStatus, changedAt: entry.changedAt, changedBy: entry.changedBy, reason: entry.reason })),
			},
			undefined,
		);
	}
}
