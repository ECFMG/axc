import type { DataSources } from '@axc/persistence';
import { Course } from './course/index.ts';

export const Catalog = (dataSources: DataSources) => ({ Course: Course(dataSources) });
