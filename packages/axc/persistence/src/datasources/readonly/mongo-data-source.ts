import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { FilterQuery, Model, mongo, SortOrder } from 'mongoose';

interface FindOptions {
	sort?: Record<string, SortOrder>;
	skip?: number;
	limit?: number;
	collation?: mongo.CollationOptions;
}

/** Read-side access to one collection: lean documents, no aggregates, no transactions. */
interface MongoDataSource<TDoc extends MongooseSeedwork.Base> {
	find(filter: FilterQuery<TDoc>, options?: FindOptions): Promise<TDoc[]>;
	count(filter: FilterQuery<TDoc>): Promise<number>;
}

const objectIdPattern = /^[a-f\d]{24}$/i;

/** Ids arrive from URLs and request bodies; anything that is not a 24-hex ObjectId cannot match a document. */
export const isObjectIdString = (id: string): boolean => objectIdPattern.test(id);

export class MongoDataSourceImpl<TDoc extends MongooseSeedwork.Base> implements MongoDataSource<TDoc> {
	protected readonly model: Model<TDoc>;

	constructor(model: Model<TDoc>) {
		this.model = model;
	}

	async find(filter: FilterQuery<TDoc>, options: FindOptions = {}): Promise<TDoc[]> {
		const query = this.model.find(filter);
		if (options.sort) {
			query.sort(options.sort);
		}
		if (options.collation) {
			query.collation(options.collation);
		}
		if (options.skip !== undefined) {
			query.skip(options.skip);
		}
		if (options.limit !== undefined) {
			query.limit(options.limit);
		}
		return (await query.lean<TDoc[]>().exec()) as TDoc[];
	}

	async count(filter: FilterQuery<TDoc>): Promise<number> {
		return await this.model.countDocuments(filter).exec();
	}
}
