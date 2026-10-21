type SidebarsConfig = import('@docusaurus/plugin-content-docs').SidebarsConfig;

const sidebars = {
	docs: ['intro', 'healthcheck', 'courses', 'task-a-evaluation'],
} satisfies SidebarsConfig;

module.exports = sidebars;
