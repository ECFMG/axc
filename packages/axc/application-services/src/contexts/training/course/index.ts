import type { search } from './search.ts';

export { search } from './search.ts';
export interface CourseApplicationService {
	search: ReturnType<typeof search>;
}
