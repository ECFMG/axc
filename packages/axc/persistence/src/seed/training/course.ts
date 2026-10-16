import type { Domain } from '@axc/domain';
import type { CourseModelType } from '../../models/training/course.model.ts';
export const seedCourses = async (models: { Course: CourseModelType }): Promise<void> => {
	const titles = [
		'AI Security Foundations',
		'Secure TypeScript',
		'Cloud Architecture',
		'MongoDB Basics',
		'Hybrid Teamwork',
		'API Security',
		'Advanced Testing',
		'Data Privacy',
		'Frontend Essentials',
		'Threat Modelling',
		'DevOps Workshop',
		'AI Ethics',
	];
	const modalities = ['online', 'in-person', 'hybrid'] as const;
	const statuses = ['active', 'draft', 'retired'] as const;
	const courses: Domain.Contexts.Training.Course.Course[] = titles.map((title, index) => {
		const modality = modalities[index % 3];
		const status = statuses[Math.floor(index / 4)];
		if (modality === undefined || status === undefined) {
			throw new Error('Invalid seed course index');
		}
		return {
			id: `course-${String(index + 1).padStart(3, '0')}`,
			title,
			summary: index === 1 ? 'Practical security exercises.' : `Training in ${title}.`,
			modality,
			status,
			tags: index % 2 === 0 ? ['ai', 'security'] : ['engineering'],
			createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
			updatedAt: new Date(Date.UTC(2026, 5, index + 1)).toISOString(),
		};
	});
	await models.Course.bulkWrite(
		courses.map(({ id, ...course }) => ({
			updateOne: { filter: { courseId: id }, update: { $setOnInsert: { ...course, createdAt: new Date(course.createdAt), updatedAt: new Date(course.updatedAt), courseId: id } }, upsert: true, timestamps: false },
		})),
	);
};
