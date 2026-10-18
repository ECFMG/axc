type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'decisions/0001-in-memory-course-catalog', 'traceability'],
} satisfies SidebarsConfig;

module.exports = sidebars;
