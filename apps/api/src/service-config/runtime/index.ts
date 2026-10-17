import { type HealthEnvironment, resolveEnvironment } from '@axc/application-services';

// biome-ignore lint/complexity/useLiteralKeys: ProcessEnv.NODE_ENV is an index signature under noPropertyAccessFromIndexSignature
export const environment: HealthEnvironment = resolveEnvironment(process.env['NODE_ENV']);

// biome-ignore lint/complexity/useLiteralKeys: ProcessEnv uses an index signature
export const mongoUri = process.env['MONGODB_URI']?.trim() || undefined;
