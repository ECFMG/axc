import type { changeStatus } from './change-status.ts';
import type { create } from './create.ts';
import type { list } from './list.ts';
import type { queryById } from './query-by-id.ts';

export { changeStatus } from './change-status.ts';
export { create } from './create.ts';
export { list } from './list.ts';
export { queryById } from './query-by-id.ts';
export interface EnrollmentRequestApplicationService {
	create: ReturnType<typeof create>;
	queryById: ReturnType<typeof queryById>;
	list: ReturnType<typeof list>;
	changeStatus: ReturnType<typeof changeStatus>;
}
