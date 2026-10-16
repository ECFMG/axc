import type { Course } from '@axc/data-sources-mongoose-models';
import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';

export class CourseConverter extends MongooseSeedwork.MongoTypeConverter<Course, CourseDomainAdapter, Domain.Passport, Domain.Contexts.Course.Course.Course<CourseDomainAdapter>> {
	constructor() {
		super(CourseDomainAdapter, Domain.Contexts.Course.Course.Course);
	}
}

export class CourseDomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<Course> implements Domain.Contexts.Course.Course.CourseProps {
	get title(): string {
		return this.doc.title;
	}
	set title(title: string) {
		this.doc.title = title;
	}
	get summary(): string {
		return this.doc.summary;
	}
	set summary(summary: string) {
		this.doc.summary = summary;
	}
	get modality(): string {
		return this.doc.modality;
	}
	set modality(modality: string) {
		this.doc.modality = modality;
	}
	get status(): string {
		return this.doc.status;
	}
	set status(status: string) {
		this.doc.status = status;
	}
	get tags(): string[] {
		return this.doc.tags;
	}
	set tags(tags: string[]) {
		this.doc.tags = tags;
	}
}
