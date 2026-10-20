type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'courses-implementation', 'api/courses', 'api/enrollment-requests'],
} satisfies SidebarsConfig;

module.exports = sidebars;
