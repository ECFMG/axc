import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';

const config: Config = {
	title: 'agentCourses',
	tagline: 'Training course catalog API',
	url: 'https://docs.agentcourses.localhost',
	baseUrl: '/',
	organizationName: 'agentcourses',
	projectName: 'agentCourses',
	onBrokenLinks: 'throw',
	markdown: {
		hooks: {
			onBrokenMarkdownLinks: 'throw',
		},
	},
	presets: [
		[
			'classic',
			{
				docs: {
					sidebarPath: './sidebars.ts',
					routeBasePath: '/',
				},
				blog: false,
				theme: {
					customCss: './src/css/custom.css',
				},
			} satisfies Preset.Options,
		],
	],
};

export default config;
