type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: [
		'intro',
		'healthcheck',
		'courses',
		{
			type: 'category',
			label: 'Decisions',
			items: ['decisions/course-catalog-search'],
		},
	],
} satisfies SidebarsConfig;

module.exports = sidebars;
