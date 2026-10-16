import { courseSeed, enrollmentRequestSeed } from '@axc/data-sources-mongoose-models';
import { createMemoryMongoServer } from '@axc/service-mongoose';
import mongoose from 'mongoose';

let memoryServer: ReturnType<typeof createMemoryMongoServer> | undefined;
let ready: Promise<void> | undefined;

export function ensureCourseCatalog(): Promise<void> {
	ready ??= openCourseCatalog();
	return ready;
}

async function openCourseCatalog(): Promise<void> {
	memoryServer = createMemoryMongoServer();
	await memoryServer.start();
	await mongoose.connect(memoryServer.getUri(), { retryWrites: false });
	// biome-ignore lint/complexity/useLiteralKeys: Mongoose models is an index signature under noPropertyAccessFromIndexSignature
	const course = mongoose.models['Course'];
	if (!course) {
		throw new Error('Course model is not registered');
	}
	if ((await course.estimatedDocumentCount()) > 0) {
		return;
	}
	await course.collection.insertMany(
		courseSeed.map((document) => ({
			...document,
			_id: new mongoose.Types.ObjectId(document._id),
		})),
	);
	// biome-ignore lint/complexity/useLiteralKeys: Mongoose models is an index signature under noPropertyAccessFromIndexSignature
	const enrollmentRequest = mongoose.models['EnrollmentRequest'];
	if (!enrollmentRequest) {
		throw new Error('EnrollmentRequest model is not registered');
	}
	if ((await enrollmentRequest.estimatedDocumentCount()) > 0) {
		return;
	}
	await enrollmentRequest.collection.insertMany(
		enrollmentRequestSeed.map((document) => ({
			...document,
			_id: new mongoose.Types.ObjectId(document._id),
		})),
	);
}
