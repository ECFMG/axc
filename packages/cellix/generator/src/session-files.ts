import type { GeneratedFile, GenerateFeatureOptions } from './types.ts';

/** query scaffolds files. It does not record a read or write list. ocom-write.config.json stays the map. */
export function recordAgentSession(_options: GenerateFeatureOptions, _written: GeneratedFile[]): void {
	// The startup session already holds the agent id. A slice does not close the other files.
}
