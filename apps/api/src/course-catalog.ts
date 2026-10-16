import { courseSeed } from '@axc/data-sources-mongoose-models';
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
	await mongoose.connect(memoryServer.getUri());
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
}
