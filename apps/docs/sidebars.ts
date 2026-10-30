type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'run-record'],
} satisfies SidebarsConfig;

module.exports = sidebars;
