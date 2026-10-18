type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'enrollment-requests', 'decisions/0001-in-memory-enrollment', 'traceability'],
} satisfies SidebarsConfig;

module.exports = sidebars;
