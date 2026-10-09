import type { ApplicationServices, CourseQueryCommand } from '@axc/application-services';

export const courseQuery = async (applicationServices: ApplicationServices, command: CourseQueryCommand) => {
	return await applicationServices.Course.Course.query(command);
};
