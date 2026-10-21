type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: [
		'intro',
		'healthcheck',
		'api/courses',
		'api/enrollment-requests',
		{
			type: 'category',
			label: 'Decisions',
			items: ['decisions/course-catalog-search', 'decisions/enrollment-requests'],
		},
	],
} satisfies SidebarsConfig;

module.exports = sidebars;
