import type { Store } from '../store.ts';
import { TrainingReadContext } from './training/index.ts';
export const ReadonlyDataSourceImplementation = (store: Store) => ({ Training: TrainingReadContext(store) });
