import { rm } from 'node:fs/promises';

await rm('.cellix/session.json', { force: true });
await rm('.cellix/verify.json', { force: true });
