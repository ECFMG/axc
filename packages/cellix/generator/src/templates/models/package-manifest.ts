/** Workspace manifest for the mongoose models package. Written once, when the file is missing. */
export function modelsPackageJson(packageName: string): string {
	return `{
	"name": "${packageName}",
	"version": "1.0.0",
	"private": true,
	"type": "module",
	"files": ["dist"],
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"scripts": {
		"lint": "biome lint",
		"format": "biome format --write",
		"format:check": "biome format .",
		"prebuild": "pnpm run lint",
		"build": "tsgo --build",
		"typecheck": "tsgo --noEmit",
		"watch": "tsgo --watch",
		"test": "vitest run --silent --reporter=dot",
		"clean": "rimraf dist tsconfig.tsbuildinfo"
	},
	"dependencies": {
		"@cellix/mongoose-seedwork": "workspace:*",
		"mongoose": "catalog:"
	},
	"devDependencies": {
		"@cellix/config-typescript": "workspace:*",
		"@cellix/config-vitest": "workspace:*",
		"rimraf": "catalog:",
		"typescript": "catalog:",
		"vitest": "catalog:"
	}
}
`;
}

export function modelsTsconfig(): string {
	return `{
	"extends": "@cellix/config-typescript/node",
	"compilerOptions": {
		"outDir": "dist",
		"rootDir": "src",
		"tsBuildInfoFile": "dist/tsconfig.tsbuildinfo"
	},
	"include": ["src/**/*.ts"],
	"references": [{ "path": "../../cellix/mongoose-seedwork" }]
}
`;
}
