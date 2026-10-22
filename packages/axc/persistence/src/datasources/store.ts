import type { Training } from '@axc/domain';
export interface Store {
	courses: Training.Course.CourseProps[];
	requests: Training.EnrollmentRequest.EnrollmentRequestProps[];
}
const titles = [
	'AI Security Foundations',
	'Cloud Architecture',
	'Data Ethics',
	'Secure Coding',
	'Machine Learning Basics',
	'Leadership Skills',
	'Network Defense',
	'Advanced AI',
	'Project Management',
	'Accessibility Basics',
	'Software Testing',
	'Privacy Engineering',
];
const modalities: Training.Course.CourseProps['modality'][] = ['online', 'in-person', 'hybrid'];
const statuses: Training.Course.CourseProps['status'][] = ['active', 'draft', 'retired'];
export const createStore = (): Store => ({
	courses: titles.map((title, index) => ({
		id: `course-${String(index + 1).padStart(3, '0')}`,
		title,
		summary: index === 0 ? 'Introductory course on secure AI-assisted development.' : `Training in ${title.toLowerCase()}.`,
		modality: index === 2 ? 'online' : (modalities[index % 3] ?? 'online'),
		status: index === 1 ? 'active' : index === 2 ? 'draft' : (statuses[index % 3] ?? 'active'),
		tags: index === 0 ? ['ai', 'security'] : index === 1 || index === 2 ? [...title.toLowerCase().split(' '), 'security'] : title.toLowerCase().split(' '),
		createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
		updatedAt: new Date(Date.UTC(2026, 5, index + 1)).toISOString(),
	})),
	requests: [],
});
