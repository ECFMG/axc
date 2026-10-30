import { registerWorldLifecycleHooks } from '@cellix/serenity-framework/cucumber';
import { getTimeout } from '@cellix/serenity-framework/settings';
import type { IWorld } from '@cucumber/cucumber';
import { infrastructure, stopMemoryMongo } from './infrastructure.ts';
import type { AgentCoursesApiWorld } from './world.ts';

/** Register the Cucumber Before/After/AfterAll hooks for the API acceptance suite. */
export function registerLifecycleHooks(): void {
	registerWorldLifecycleHooks<IWorld & AgentCoursesApiWorld>({
		scenarioTimeout: getTimeout('scenario'),
		before: async (world) => {
			await world.init();
		},
		after: async (world) => {
			await world.cleanup();
		},
		afterAll: async () => {
			await infrastructure.stopAll();
			await stopMemoryMongo();
		},
	});
}
