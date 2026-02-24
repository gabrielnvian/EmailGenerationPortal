import {Persona} from "../../personas.model";

export async function queueEmails(
	fromField: string,
	toField: string,
	idea: string,
	fromPersonas: Persona[],
	toPersonas: Persona[],
	n: number,
	length: number,
	version: number
) {
	const url = version === 1
		? "https://n8n.tail068f9.ts.net/webhook/generate-email"
		: "https://n8n.tail068f9.ts.net/webhook/3726feba-2e41-424a-a5d9-04713248c600";

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
			emailCount: n,
			length
		})
	});

	console.log(response)
}

export async function coldStart() {
	const response = await fetch('https://n8n.tail068f9.ts.net/webhook/ollama-cold-start', {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: "{}"
	});

	console.log(response)
}
