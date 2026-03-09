import {Persona} from "./personas.model";

function parseCSVLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				// Escaped quote inside quoted field
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			fields.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	fields.push(current);
	return fields;
}

function wouldCreateCycle(persona: Persona, potentialSupervisor: Persona): boolean {
	let current: Persona | null = potentialSupervisor;
	while (current !== null) {
		if (current === persona) return true;
		current = current.supervisor;
	}
	return false;
}

export function CsvToPersonas(csv: string): Persona[] {
	const lines = csv.split(/\r?\n/);
	const personas: Persona[] = [];

	// First pass: create all personas without supervisors
	for (let i = 1; i < lines.length; i++) {
		if (!lines[i].trim()) continue;
		const fields = parseCSVLine(lines[i]);
		personas.push(new Persona(fields[0], fields[1], fields[2], fields[3], fields[4], fields[5], null));
	}

	// Second pass: assign supervisors (handles forward references)
	let dataIdx = 0;
	for (let i = 1; i < lines.length; i++) {
		if (!lines[i].trim()) continue;
		const fields = parseCSVLine(lines[i]);
		const supervisorRowNum = parseInt(fields[6]);

		if (!isNaN(supervisorRowNum)) {
			// supervisorRowNum is the 1-based CSV row number (row 1 = header, row 2 = first data row)
			const supervisorArrayIdx = supervisorRowNum - 2;
			if (supervisorArrayIdx >= 0 && supervisorArrayIdx < personas.length) {
				const candidate = personas[supervisorArrayIdx];
				if (!wouldCreateCycle(personas[dataIdx], candidate)) {
					personas[dataIdx].supervisor = candidate;
				}
			}
		}

		dataIdx++;
	}

	return personas;
}
