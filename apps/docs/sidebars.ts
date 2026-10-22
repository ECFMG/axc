type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: [
		'intro',
		'healthcheck',
		{
			type: 'category',
			label: 'API',
			items: ['api/courses', 'api/enrollment-requests'],
		},
		{
			type: 'category',
			label: 'Decisions',
			items: ['adr/in-memory-course-enrollment'],
		},
	],
} satisfies SidebarsConfig;

module.exports = sidebars;
