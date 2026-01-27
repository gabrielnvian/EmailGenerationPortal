import {Persona} from "../../personas.model";

export async function queueEmails(fromField: string, toField: string, idea: string, fromPersonas: Persona[], toPersonas: Persona[], n: number) {
	const url = "https://n8n.tail068f9.ts.net/webhook/generate-email";

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			fromField,
			toField,
			idea,
			from: fromPersonas.map(persona => JSON.stringify(persona)),
			to: toPersonas.map(persona => JSON.stringify(persona)),
			emailCount: n
		})
	});
}
