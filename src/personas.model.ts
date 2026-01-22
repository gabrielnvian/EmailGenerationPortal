export class Persona {
	public name: string;
	public jobTitle: string;
	public company: string;
	public phone: string;
	public email: string;
	public supervisor: Persona | null;

	constructor(name: string, jobTitle: string, company: string, phone: string, email: string, supervisor: Persona | null = null) {
		this.name = name;
		this.jobTitle = jobTitle;
		this.company = company;
		this.phone = phone;
		this.email = email;
		this.supervisor = supervisor;
	}
}
