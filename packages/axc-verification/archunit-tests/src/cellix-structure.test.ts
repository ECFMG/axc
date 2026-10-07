import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeCellixStructureTests } from '@cellix/archunit-tests/structure';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describeCellixStructureTests({ root });
