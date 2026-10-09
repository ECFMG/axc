import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import { type DomainEntityProps, PermissionError } from '@cellix/domain-seedwork/domain-entity';
import type { Passport } from '../../passport.ts';
import type { CourseVisa } from '../course.visa.ts';
import * as ValueObjects from './course.value-objects.ts';

export interface CourseProps extends DomainEntityProps {
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly schemaVersion: string;
}

export interface CourseEntityReference extends Readonly<CourseProps> {}

export interface CourseNewInput {
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
}

export class Course<props extends CourseProps> extends AggregateRoot<props, Passport> implements CourseEntityReference {
	private isNew: boolean = false;
	private readonly visa: CourseVisa;
	constructor(props: props, passport: Passport) {
		super(props, passport);
		this.visa = passport.course.forCourse(this);
	}

	public static getNewInstance<props extends CourseProps>(newProps: props, input: CourseNewInput, passport: Passport): Course<props> {
		const newInstance = new Course(newProps, passport);
		newInstance.markAsNew();
		newInstance.title = input.title;
		newInstance.summary = input.summary;
		newInstance.modality = input.modality;
		newInstance.status = input.status;
		newInstance.tags = input.tags;
		newInstance.isNew = false;
		return newInstance;
	}

	private markAsNew(): void {
		this.isNew = true;
	}

	get title(): string {
		return this.props.title;
	}
	set title(title: string) {
		if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageCourse)) {
			throw new PermissionError('You do not have permission to change title');
		}
		this.props.title = new ValueObjects.Title(title).valueOf();
	}

	get summary(): string {
		return this.props.summary;
	}
	set summary(summary: string) {
		if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageCourse)) {
			throw new PermissionError('You do not have permission to change summary');
		}
		this.props.summary = new ValueObjects.Summary(summary).valueOf();
	}

	get modality(): string {
		return this.props.modality;
	}
	set modality(modality: string) {
		if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageCourse)) {
			throw new PermissionError('You do not have permission to change modality');
		}
		this.props.modality = new ValueObjects.Modality(modality).valueOf();
	}

	get status(): string {
		return this.props.status;
	}
	set status(status: string) {
		if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageCourse)) {
			throw new PermissionError('You do not have permission to change status');
		}
		this.props.status = new ValueObjects.Status(status).valueOf();
	}

	get tags(): string[] {
		return this.props.tags;
	}
	set tags(tags: string[]) {
		if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageCourse)) {
			throw new PermissionError('You do not have permission to change tags');
		}
		this.props.tags = [...new ValueObjects.Tags(tags).valueOf()];
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}
	get updatedAt(): Date {
		return this.props.updatedAt;
	}
	get schemaVersion(): string {
		return this.props.schemaVersion;
	}
}
