import { getDb } from './db';

export type PersonaRow = {
	id: number;
	name: string;
	job_title: string;
	company: string;
	field: string;
	phone: string;
	email: string;
	supervisor_id: number | null;
};

export type CreatePersonaInput = {
	name: string;
	jobTitle: string;
	company: string;
	field: string;
	phone: string;
	email: string;
	supervisorId: number | null;
	isSelfSupervisor: boolean;
};

export type UpdatePersonaInput = CreatePersonaInput;

export function getAllPersonas(): PersonaRow[] {
	return getDb().prepare('SELECT * FROM personas ORDER BY id').all() as PersonaRow[];
}

export function getPersonaById(id: number): PersonaRow | undefined {
	return getDb().prepare('SELECT * FROM personas WHERE id = ?').get(id) as PersonaRow | undefined;
}

export function findByEmail(email: string): PersonaRow | undefined {
	return getDb().prepare('SELECT * FROM personas WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))').get(email) as PersonaRow | undefined;
}

export function findByPhone(phone: string): PersonaRow | undefined {
	if (!phone.trim()) return undefined;
	return getDb().prepare('SELECT * FROM personas WHERE TRIM(phone) = TRIM(?) AND phone != \'\'').get(phone) as PersonaRow | undefined;
}

export function findByNameAndCompany(name: string, company: string): PersonaRow | undefined {
	return getDb().prepare(
		'SELECT * FROM personas WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND LOWER(TRIM(company)) = LOWER(TRIM(?))'
	).get(name, company) as PersonaRow | undefined;
}

export function createPersona(data: CreatePersonaInput): PersonaRow {
	const db = getDb();

	const insert = db.prepare(`
		INSERT INTO personas (name, job_title, company, field, phone, email, supervisor_id)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);

	if (data.isSelfSupervisor) {
		// Insert without supervisor, then update to point to self
		const result = insert.run(data.name, data.jobTitle, data.company, data.field, data.phone, data.email, null);
		const id = result.lastInsertRowid as number;
		db.prepare('UPDATE personas SET supervisor_id = ? WHERE id = ?').run(id, id);
		return getPersonaById(id)!;
	} else {
		const result = insert.run(data.name, data.jobTitle, data.company, data.field, data.phone, data.email, data.supervisorId);
		return getPersonaById(result.lastInsertRowid as number)!;
	}
}

export function updatePersona(id: number, data: UpdatePersonaInput): PersonaRow {
	const db = getDb();

	let supervisorId: number | null;
	if (data.isSelfSupervisor) {
		supervisorId = id;
	} else {
		supervisorId = data.supervisorId;
	}

	db.prepare(`
		UPDATE personas
		SET name = ?, job_title = ?, company = ?, field = ?, phone = ?, email = ?, supervisor_id = ?
		WHERE id = ?
	`).run(data.name, data.jobTitle, data.company, data.field, data.phone, data.email, supervisorId, id);

	return getPersonaById(id)!;
}

export function deletePersona(id: number): void {
	getDb().prepare('DELETE FROM personas WHERE id = ?').run(id);
}

export function wouldCreateCycle(personaId: number, newSupervisorId: number): boolean {
	let currentId: number | null = newSupervisorId;
	const visited = new Set<number>();
	while (currentId !== null) {
		if (currentId === personaId) return true;
		if (visited.has(currentId)) return false;
		visited.add(currentId);
		const row = getPersonaById(currentId);
		currentId = row?.supervisor_id ?? null;
	}
	return false;
}
