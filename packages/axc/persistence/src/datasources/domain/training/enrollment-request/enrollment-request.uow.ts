import { Domain } from '@axc/domain';
import type { ModelsContext } from '../../../../models/index.ts';
import { EnrollmentRequestDomainAdapter } from './enrollment-request.domain-adapter.ts';

const EnrollmentError = Domain.Contexts.Training.EnrollmentRequest.EnrollmentError;
type EnrollmentRequest = Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest;
/** Stages a single aggregate, then atomically commits its state and embedded history.
 * Version matching prevents lost updates; the partial unique index protects concurrent creates.
 * This does not require replica-set transactions on the local standalone MongoDB.
 */
export function getEnrollmentRequestUnitOfWork(models: ModelsContext): Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork {
	return {
		async withTransaction(_passport, callback) {
			let staged: EnrollmentRequest | undefined;
			let loadedId: string | undefined;
			let version: number | undefined;
			await callback({
				async get(id) {
					const doc = await models.EnrollmentRequest.findOne({ requestId: id }).exec();
					if (doc === null) {
						throw new EnrollmentError('ENROLLMENT_REQUEST_NOT_FOUND');
					}
					loadedId = id;
					version = doc.version;
					return new EnrollmentRequestDomainAdapter(doc).toDomain();
				},
				save(item) {
					if (staged !== undefined && staged.id !== item.id) {
						throw new Error('A unit of work saves one enrollment request');
					}
					staged = item;
					return Promise.resolve(item);
				},
			});
			if (staged === undefined) {
				return;
			}
			const snapshot = staged.toSnapshot();
			const { id, ...fields } = snapshot;
			const document = { ...fields, requestId: id, createdAt: new Date(fields.createdAt), updatedAt: new Date(fields.updatedAt) };
			try {
				if (loadedId === undefined) {
					await models.EnrollmentRequest.create({ ...document, version: 0 });
				} else {
					if (loadedId !== id) {
						throw new Error('A unit of work saves its loaded aggregate');
					}
					const result = await models.EnrollmentRequest.updateOne({ requestId: id, version }, { $set: document, $inc: { version: 1 } }).exec();
					if (result.modifiedCount !== 1) {
						throw new EnrollmentError('INVALID_STATUS_TRANSITION');
					}
				}
			} catch (error) {
				if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
					throw new EnrollmentError('DUPLICATE_ACTIVE_REQUEST');
				}
				throw error;
			}
		},
	};
}
