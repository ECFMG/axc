import type { mongooseContextBuilder } from '@axc/data-sources-mongoose-models';

export type ModelsContext = ReturnType<typeof mongooseContextBuilder>;
