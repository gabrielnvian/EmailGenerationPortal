import {Persona} from "./personas.model";

export function CsvToPersonas(csv: string): Persona[] {
	const lines = csv.split(/\r?\n/);
	const personas: Persona[] = [];

	for (let i = 1; i < lines.length; i++) {
		if (!lines[i]) continue;

		const currentLine = lines[i].split(",");

		const supervisorIdx = parseInt(currentLine[5]);

		const supervisor: Persona | null = isNaN(supervisorIdx)
			? null
			: personas[supervisorIdx - 2]

		const persona = new Persona(
			currentLine[0],
			currentLine[1],
			currentLine[2],
			currentLine[3],
			currentLine[4],
			currentLine[5],
			supervisor
		);

		personas.push(persona);
	}

	return personas;
}
