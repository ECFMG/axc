type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'api/courses', 'api/enrollment-requests', 'adr/0001-training-workflow-storage'],
} satisfies SidebarsConfig;

module.exports = sidebars;
