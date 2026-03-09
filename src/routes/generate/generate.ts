import {Persona} from "../../personas.model";

export type ActionResult = { success: true } | { success: false; error: string };

export async function queueEmails(
	fromField: string,
	toField: string,
	idea: string,
	fromPersonas: Persona[],
	toPersonas: Persona[],
	n: number,
	length: number,
	version: number
): Promise<ActionResult> {
	const url = version === 1
		? "https://n8n.tail068f9.ts.net/webhook/generate-email"
		: "https://n8n.tail068f9.ts.net/webhook/3726feba-2e41-424a-a5d9-04713248c600";

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {"Content-Type": "application/json"},
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

		if (!response.ok) {
			return {success: false, error: `Server error: ${response.status} ${response.statusText}`};
		}

		return {success: true};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : "Unknown error"};
	}
}

export async function coldStart(): Promise<ActionResult> {
	try {
		const response = await fetch('https://n8n.tail068f9.ts.net/webhook/ollama-cold-start', {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: "{}"
		});

		if (!response.ok) {
			return {success: false, error: `Server error: ${response.status} ${response.statusText}`};
		}

		return {success: true};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : "Unknown error"};
	}
}
