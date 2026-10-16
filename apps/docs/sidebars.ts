type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'adr/course-catalog-storage'],
} satisfies SidebarsConfig;

module.exports = sidebars;
