type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'courses-implementation'],
} satisfies SidebarsConfig;

module.exports = sidebars;
