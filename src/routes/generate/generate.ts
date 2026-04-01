import {Persona} from "../../personas.model";
import {PUBLIC_GENERATE_URL} from '$env/static/public';

export type GeneratePersona = {
	name: string;
	email: string;
	jobTitle: string;
	company: string;
	field?: string;
	phone?: string;
	tone?: string;
	personalDetails?: string[];
};

export type MessageMetadata = {
	sentiment: string;
	urgency: string;
	relationshipStage: string;
	topics: string[];
	personalDetailsMentioned: string[];
};

export type GmailHeader = {
	name: string;
	value: string;
};

export type GmailMessage = {
	id: string;
	threadId: string;
	labelIds: string[];
	snippet: string;
	payload: {
		headers: GmailHeader[];
		body: {
			size: number;
			data: string;
		};
		[key: string]: unknown;
	};
	[key: string]: unknown;
};

export type ThreadMessage = {
	gmail: GmailMessage;
	metadata: MessageMetadata;
};

export type Thread = {
	threadId: string;
	subject: string;
	messages: ThreadMessage[];
};

export type GenerateSummary = {
	totalMessages: number;
	timespanDays: number;
	sentimentProgression: string[];
	arcDescription: string;
};

export type GenerateData = {
	timeline: Thread[];
	summary: GenerateSummary;
};

export type GenerateResult =
	{ success: true; data: GenerateData; id?: number } |
	{ success: false; error: string };

export type GenerateRequest = {
	personas: GeneratePersona[];
	relationship: string;
	arc?: string;
	threadCount?: number;
	timespan?: string;
};

export function personaToGeneratePersona(
	persona: Persona,
	tone?: string,
	personalDetails?: string[]
): GeneratePersona {
	const result: GeneratePersona = {
		name: persona.name,
		email: persona.email,
		jobTitle: persona.jobTitle,
		company: persona.company,
	};
	if (persona.field) result.field = persona.field;
	if (persona.phone) result.phone = persona.phone;
	if (tone) result.tone = tone;
	if (personalDetails?.length) result.personalDetails = personalDetails;
	return result;
}

/** Decode base64url email body to plain text. */
export function decodeEmailBody(data: string): string {
	try {
		const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
		return atob(base64);
	} catch {
		return data;
	}
}

/** Extract a header value from a Gmail message. */
export function getHeader(gmail: GmailMessage, name: string): string {
	return gmail.payload?.headers?.find(
		(h: GmailHeader) => h.name.toLowerCase() === name.toLowerCase()
	)?.value ?? '';
}

export async function generateEmails(request: GenerateRequest): Promise<GenerateResult> {
	try {
		const body: Record<string, unknown> = {
			personas: request.personas,
			relationship: request.relationship,
		};

		if (request.arc) body.arc = request.arc;
		if (request.threadCount !== undefined) body.threadCount = request.threadCount;
		if (request.timespan) body.timespan = request.timespan;

		const response = await fetch(PUBLIC_GENERATE_URL, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			return {success: false, error: `Server error: ${response.status} ${response.statusText}`};
		}

		const json = await response.json();
		return {success: true, data: json.data ?? json, id: json.id};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : 'Unknown error'};
	}
}
