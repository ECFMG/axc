import type { Store } from '../store.ts';
import { TrainingDomainContext } from './training/index.ts';
export const DomainDataSourceImplementation = (store: Store) => ({ Training: TrainingDomainContext(store) });
