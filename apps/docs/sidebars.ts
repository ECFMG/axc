type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: [
		'intro',
		'healthcheck',
		{
			type: 'category',
			label: 'API',
			collapsed: false,
			items: ['api/courses', 'api/enrollment-requests'],
		},
		{
			type: 'category',
			label: 'Decisions',
			items: ['decisions/in-memory-repositories-for-the-course-catalog', 'decisions/enrollment-request-lifecycle-in-the-domain-layer'],
		},
	],
} satisfies SidebarsConfig;

module.exports = sidebars;
