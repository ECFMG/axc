type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: [
		'intro',
		'healthcheck',
		'courses',
		{
			type: 'category',
			label: 'Architecture decisions',
			items: ['adr/in-memory-course-catalog'],
		},
	],
} satisfies SidebarsConfig;

module.exports = sidebars;
