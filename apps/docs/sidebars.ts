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
	],
} satisfies SidebarsConfig;

module.exports = sidebars;
