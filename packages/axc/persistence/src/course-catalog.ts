import type { Course, CourseCatalog } from '@axc/domain';

const courseRecords: readonly Course[] = [
	defineCourse({
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-002',
		title: 'Accessibility Basics',
		summary: 'Practical techniques for inclusive digital content.',
		modality: 'online',
		status: 'active',
		tags: ['accessibility', 'design'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-15T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-003',
		title: 'Classroom Leadership',
		summary: 'Facilitating in-person workshops for new leads.',
		modality: 'in-person',
		status: 'active',
		tags: ['leadership', 'communication'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-20T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-004',
		title: 'Cloud Platform Primer',
		summary: 'Introduces shared platform security baselines for operators.',
		modality: 'online',
		status: 'active',
		tags: ['cloud', 'operations'],
		createdAt: '2026-01-20T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-005',
		title: 'Compliance Studio',
		summary: 'Hybrid review of control mapping.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['compliance', 'security'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2026-01-10T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-006',
		title: 'Data Ethics Draft',
		summary: 'Draft discussion of responsible data use.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['ethics', 'data'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-02T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-007',
		title: 'Facilitation Lab',
		summary: 'Practice session for new facilitators.',
		modality: 'in-person',
		status: 'draft',
		tags: ['facilitation', 'leadership'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-02T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-008',
		title: 'First Aid Refresh',
		summary: 'Retired safety orientation for campus staff.',
		modality: 'in-person',
		status: 'retired',
		tags: ['safety', 'catalog-only'],
		createdAt: '2024-06-01T00:00:00.000Z',
		updatedAt: '2025-06-01T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-009',
		title: 'Hybrid AI Workshop',
		summary: 'Hands-on AI exercises across classroom and remote labs.',
		modality: 'hybrid',
		status: 'active',
		tags: ['ai', 'workshop'],
		createdAt: '2026-02-10T00:00:00.000Z',
		updatedAt: '2026-07-01T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-010',
		title: 'Mainframe Operations',
		summary: 'Legacy operations catalog entry kept for reference.',
		modality: 'online',
		status: 'retired',
		tags: ['legacy', 'operations'],
		createdAt: '2023-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-011',
		title: 'Onboarding Pathways',
		summary: 'Draft online orientation for new staff.',
		modality: 'online',
		status: 'draft',
		tags: ['onboarding'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-15T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-012',
		title: 'Product Discovery',
		summary: 'Hybrid discovery for AI-enabled products.',
		modality: 'hybrid',
		status: 'active',
		tags: ['product', 'ai'],
		createdAt: '2026-03-15T00:00:00.000Z',
		updatedAt: '2026-05-15T00:00:00.000Z',
	}),
	defineCourse({
		id: 'course-013',
		title: 'Security Lab',
		summary: 'In-person lab covering threat modeling.',
		modality: 'in-person',
		status: 'active',
		tags: ['security', 'lab'],
		createdAt: '2026-04-10T00:00:00.000Z',
		updatedAt: '2026-04-11T00:00:00.000Z',
	}),
];

export function createCourseCatalog(): CourseCatalog {
	return {
		listCourses(): readonly Course[] {
			return courseRecords.slice();
		},
	};
}

function defineCourse(course: Course): Course {
	return Object.freeze({
		...course,
		tags: Object.freeze([...course.tags]),
	});
}
