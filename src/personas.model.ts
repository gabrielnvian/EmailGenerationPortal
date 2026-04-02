export class Persona {
	public id: number;
	public name: string;
	public jobTitle: string;
	public company: string;
	public field: string;
	public phone: string;
	public email: string;
	public supervisor: Persona | null;
	public personality: string;
	public signature: string;

	constructor(id: number, name: string, jobTitle: string, company: string, field: string, phone: string, email: string, supervisor: Persona | null = null, personality: string = '', signature: string = '') {
		this.id = id;
		this.name = name;
		this.jobTitle = jobTitle;
		this.company = company;
		this.field = field;
		this.phone = phone;
		this.email = email;
		this.supervisor = supervisor;
		this.personality = personality;
		this.signature = signature;
	}

	toJSON(): Record<string, unknown> {
		return {
			id: this.id,
			name: this.name,
			jobTitle: this.jobTitle,
			company: this.company,
			field: this.field,
			phone: this.phone,
			email: this.email,
			supervisorId: this.supervisor?.id ?? null,
			personality: this.personality,
			signature: this.signature
		};
	}
}
