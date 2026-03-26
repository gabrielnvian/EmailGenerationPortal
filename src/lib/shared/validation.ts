export const MAX_NAME_LENGTH = 100;
export const MAX_JOB_TITLE_LENGTH = 120;
export const MAX_COMPANY_LENGTH = 120;
export const MAX_FIELD_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PHONE_LENGTH = 7;
export const MAX_PHONE_LENGTH = 15;

export function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isDigitsOnly(value: string): boolean {
	return /^[0-9]+$/.test(value);
}

export function normalize(value: string): string {
	return value.trim().toLowerCase();
}

export type PersonaLike = {
	id?: number;
	name: string;
	email: string;
	phone: string;
	company: string;
};

export type PersonaInput = {
	name: string;
	jobTitle: string;
	company: string;
	field: string;
	phone: string;
	email: string;
	supervisorId: number | null;
	isSelfSupervisor: boolean;
};

export function validatePersonaInput(
	data: PersonaInput,
	existingPersonas: PersonaLike[],
	editingId?: number
): string {
	if (!data.name || !data.jobTitle || !data.company || !data.field || !data.email) {
		return 'Please fill all required fields.';
	}

	if (data.name.length > MAX_NAME_LENGTH) {
		return `Full Name cannot exceed ${MAX_NAME_LENGTH} characters.`;
	}
	if (data.jobTitle.length > MAX_JOB_TITLE_LENGTH) {
		return `Job Title cannot exceed ${MAX_JOB_TITLE_LENGTH} characters.`;
	}
	if (data.company.length > MAX_COMPANY_LENGTH) {
		return `Company cannot exceed ${MAX_COMPANY_LENGTH} characters.`;
	}
	if (data.field.length > MAX_FIELD_LENGTH) {
		return `Field cannot exceed ${MAX_FIELD_LENGTH} characters.`;
	}
	if (data.email.length > MAX_EMAIL_LENGTH) {
		return `Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`;
	}

	if (!isValidEmail(data.email)) {
		return 'Enter a valid email address.';
	}

	if (data.phone) {
		if (!isDigitsOnly(data.phone)) {
			return 'Phone number must contain digits only.';
		}
		if (data.phone.length < MIN_PHONE_LENGTH || data.phone.length > MAX_PHONE_LENGTH) {
			return `Phone number must be between ${MIN_PHONE_LENGTH} and ${MAX_PHONE_LENGTH} digits.`;
		}
	}

	if (!data.isSelfSupervisor && data.supervisorId == null) {
		return 'Select a supervisor, or mark the persona as self-supervised.';
	}

	const others = editingId != null
		? existingPersonas.filter(p => p.id !== editingId)
		: existingPersonas;

	const emailKey = normalize(data.email);
	if (others.some(p => normalize(p.email) === emailKey)) {
		return 'That email already exists.';
	}

	const phoneKey = data.phone.trim();
	if (phoneKey && others.some(p => p.phone.trim() !== '' && p.phone.trim() === phoneKey)) {
		return 'That phone number already exists.';
	}

	const nameKey = normalize(data.name);
	const companyKey = normalize(data.company);
	if (others.some(p => normalize(p.name) === nameKey && normalize(p.company) === companyKey)) {
		return 'That name + company combination already exists.';
	}

	return '';
}
