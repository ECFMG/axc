type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'adr/in-memory-course-catalog'],
} satisfies SidebarsConfig;

module.exports = sidebars;
