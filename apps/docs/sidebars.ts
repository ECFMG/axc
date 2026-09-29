type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck'],
} satisfies SidebarsConfig;

module.exports = sidebars;
