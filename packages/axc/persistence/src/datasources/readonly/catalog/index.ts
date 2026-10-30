import type { Domain } from '@axc/domain';
import type { ModelsContext } from '../../../models-context.ts';
import { CourseReadRepositoryImpl } from './course/index.ts';

export const CatalogContext = (models: ModelsContext, passport: Domain.Passport) => ({
	Course: CourseReadRepositoryImpl(models, passport),
});
