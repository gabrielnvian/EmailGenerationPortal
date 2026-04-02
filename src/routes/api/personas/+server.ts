import { json } from '@sveltejs/kit';
import {
	getAllPersonas,
	getPersonaById,
	createPersona,
	updatePersona,
	deletePersona,
	findByEmail,
	findByPhone,
	findByNameAndCompany,
	wouldCreateCycle
} from '$lib/server/personas.repository';
import {
	normalize,
	isValidEmail,
	isDigitsOnly,
	MAX_NAME_LENGTH,
	MAX_JOB_TITLE_LENGTH,
	MAX_COMPANY_LENGTH,
	MAX_FIELD_LENGTH,
	MAX_EMAIL_LENGTH,
	MIN_PHONE_LENGTH,
	MAX_PHONE_LENGTH
} from '$lib/shared/validation';

type PersonaBody = {
	id?: number;
	name?: string;
	jobTitle?: string;
	company?: string;
	field?: string;
	phone?: string;
	email?: string;
	supervisorId?: number | null;
	isSelfSupervisor?: boolean;
	personality?: string;
	signature?: string;
};

function validateFields(body: PersonaBody, editingId?: number) {
	const name = (body.name ?? '').trim();
	const jobTitle = (body.jobTitle ?? '').trim();
	const company = (body.company ?? '').trim();
	const field = (body.field ?? '').trim();
	const phone = (body.phone ?? '').trim();
	const email = (body.email ?? '').trim();
	const supervisorId = body.supervisorId ?? null;
	const isSelfSupervisor = Boolean(body.isSelfSupervisor);
	const personality = (body.personality ?? '').trim();
	const signature = (body.signature ?? '').trim();

	if (!name || !jobTitle || !company || !field || !email) {
		return { error: 'All fields are required except phone.', status: 400 };
	}

	if (name.length > MAX_NAME_LENGTH) return { error: `Name cannot exceed ${MAX_NAME_LENGTH} characters.`, status: 400 };
	if (jobTitle.length > MAX_JOB_TITLE_LENGTH) return { error: `Job title cannot exceed ${MAX_JOB_TITLE_LENGTH} characters.`, status: 400 };
	if (company.length > MAX_COMPANY_LENGTH) return { error: `Company cannot exceed ${MAX_COMPANY_LENGTH} characters.`, status: 400 };
	if (field.length > MAX_FIELD_LENGTH) return { error: `Field cannot exceed ${MAX_FIELD_LENGTH} characters.`, status: 400 };
	if (email.length > MAX_EMAIL_LENGTH) return { error: `Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`, status: 400 };

	if (!isValidEmail(email)) return { error: 'Enter a valid email address.', status: 400 };

	if (phone) {
		if (!isDigitsOnly(phone)) return { error: 'Phone number must contain digits only.', status: 400 };
		if (phone.length < MIN_PHONE_LENGTH || phone.length > MAX_PHONE_LENGTH) {
			return { error: `Phone number must be between ${MIN_PHONE_LENGTH} and ${MAX_PHONE_LENGTH} digits.`, status: 400 };
		}
	}

	if (!isSelfSupervisor && supervisorId == null) {
		return { error: 'Select a supervisor, or mark the persona as self-supervised.', status: 400 };
	}

	// Uniqueness checks
	const existingByEmail = findByEmail(email);
	if (existingByEmail && existingByEmail.id !== editingId) {
		return { error: 'That email already exists.', status: 409 };
	}

	if (phone) {
		const existingByPhone = findByPhone(phone);
		if (existingByPhone && existingByPhone.id !== editingId) {
			return { error: 'That phone number already exists.', status: 409 };
		}
	}

	const existingByNameCompany = findByNameAndCompany(name, company);
	if (existingByNameCompany && existingByNameCompany.id !== editingId) {
		return { error: 'That name + company combination already exists.', status: 409 };
	}

	// Supervisor validation
	if (!isSelfSupervisor && supervisorId != null) {
		const supervisor = getPersonaById(supervisorId);
		if (!supervisor) {
			return { error: 'Selected supervisor could not be found.', status: 400 };
		}
		if (editingId != null && wouldCreateCycle(editingId, supervisorId)) {
			return { error: 'This supervisor assignment would create a circular reference.', status: 400 };
		}
	}

	const sameNameExists = getAllPersonas().some(
		p => p.id !== editingId && normalize(p.name) === normalize(name)
	);

	return {
		data: { name, jobTitle, company, field, phone, email, supervisorId, isSelfSupervisor, personality, signature },
		warning: sameNameExists ? 'A persona with this same name already exists.' : null
	};
}

export async function GET() {
	try {
		return json(getAllPersonas());
	} catch {
		return json({ error: 'Failed to read persona data.' }, { status: 500 });
	}
}

export async function POST({ request }) {
	let body: PersonaBody;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON in request body.' }, { status: 400 });
	}

	const result = validateFields(body);
	if ('error' in result) {
		return json({ success: false, error: result.error }, { status: result.status });
	}

	try {
		const persona = createPersona(result.data);
		return json({ success: true, persona, warning: result.warning });
	} catch {
		return json({ success: false, error: 'Failed to save persona.' }, { status: 500 });
	}
}

export async function PUT({ request }) {
	let body: PersonaBody;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON in request body.' }, { status: 400 });
	}

	const id = body.id;
	if (id == null || typeof id !== 'number') {
		return json({ success: false, error: 'Persona ID is required.' }, { status: 400 });
	}

	const existing = getPersonaById(id);
	if (!existing) {
		return json({ success: false, error: 'Persona not found.' }, { status: 404 });
	}

	const result = validateFields(body, id);
	if ('error' in result) {
		return json({ success: false, error: result.error }, { status: result.status });
	}

	try {
		const persona = updatePersona(id, result.data);
		return json({ success: true, persona, warning: result.warning });
	} catch {
		return json({ success: false, error: 'Failed to update persona.' }, { status: 500 });
	}
}

export async function DELETE({ request }) {
	let body: { id?: number };
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON in request body.' }, { status: 400 });
	}

	const id = body.id;
	if (id == null || typeof id !== 'number') {
		return json({ success: false, error: 'Persona ID is required.' }, { status: 400 });
	}

	const existing = getPersonaById(id);
	if (!existing) {
		return json({ success: false, error: 'Persona not found.' }, { status: 404 });
	}

	try {
		deletePersona(id);
		return json({ success: true });
	} catch {
		return json({ success: false, error: 'Failed to delete persona.' }, { status: 500 });
	}
}
