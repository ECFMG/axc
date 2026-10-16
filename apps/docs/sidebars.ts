type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'enrollment-requests'],
} satisfies SidebarsConfig;

module.exports = sidebars;
