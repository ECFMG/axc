type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: [
		'intro',
		'healthcheck',
		'courses',
		'enrollment-requests',
		{
			type: 'category',
			label: 'Architecture decisions',
			items: ['adr/in-memory-course-catalog', 'adr/in-memory-enrollment-requests'],
		},
	],
} satisfies SidebarsConfig;

module.exports = sidebars;
