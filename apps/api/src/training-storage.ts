import { initializeTrainingStorage } from '@axc/persistence';
import { ServiceMongoose } from '@axc/service-mongoose';

/** Complete local catalog setup before the API context becomes available. */
export class TrainingStorage extends ServiceMongoose {
	private readonly seedLocalCourses: boolean;
	constructor(uri: string | undefined) {
		super(uri);
		this.seedLocalCourses = uri === undefined || uri.trim().length === 0;
	}
	override async startUp(): Promise<this> {
		await super.startUp();
		try {
			await initializeTrainingStorage(this, this.seedLocalCourses);
			return this;
		} catch (error) {
			await this.shutDown();
			throw error;
		}
	}
}
