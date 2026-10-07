import { CourseReadRepositoryImpl } from './course/index.ts';

export const CatalogContext = () => ({ Course: CourseReadRepositoryImpl() });
