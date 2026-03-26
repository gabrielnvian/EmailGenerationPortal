import { writable } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { Persona } from './personas.model';

type PersonaRow = {
	id: number;
	name: string;
	job_title: string;
	company: string;
	field: string;
	phone: string;
	email: string;
	supervisor_id: number | null;
};

function rowsToPersonas(rows: PersonaRow[]): Persona[] {
	const map = new Map<number, Persona>();

	// Pass 1: create all personas without supervisors
	for (const row of rows) {
		map.set(row.id, new Persona(row.id, row.name, row.job_title, row.company, row.field, row.phone, row.email, null));
	}

	// Pass 2: assign supervisors
	for (const row of rows) {
		if (row.supervisor_id != null) {
			const persona = map.get(row.id)!;
			const supervisor = map.get(row.supervisor_id);
			if (supervisor) {
				persona.supervisor = supervisor;
			}
		}
	}

	return Array.from(map.values());
}

type PersonasStore = Readable<Persona[]> & {
	reload: () => Promise<void>;
};

function createPersonasStore(): PersonasStore {
	const { subscribe, set } = writable<Persona[]>([]);

	return {
		subscribe,
		async reload() {
			const res = await fetch('./api/personas');

			if (!res.ok) {
				throw new Error('Failed to reload personas');
			}

			const rows: PersonaRow[] = await res.json();
			set(rowsToPersonas(rows));
		}
	};
}

export const personas = createPersonasStore();
