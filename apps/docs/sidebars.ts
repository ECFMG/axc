type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'decisions/0001-catalog-fixtures'],
} satisfies SidebarsConfig;

module.exports = sidebars;
