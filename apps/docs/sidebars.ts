type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'api/courses', 'adr/catalog-storage'],
} satisfies SidebarsConfig;

module.exports = sidebars;
