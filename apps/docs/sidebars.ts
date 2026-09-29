type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', { type: 'category', label: 'Decisions', items: ['decisions/course-catalog-read-model'] }],
} satisfies SidebarsConfig;

module.exports = sidebars;
