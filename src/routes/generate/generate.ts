import {Persona} from "../../personas.model";
import {PUBLIC_GENERATE_URL} from '$env/static/public';

export type Domain = 'email' | 'calendar';

export type GeneratePersona = {
	name: string;
	email: string;
	jobTitle: string;
	company: string;
	field?: string;
	phone?: string;
	tone?: string;
	personality?: string;
	personalDetails?: string[];
	signature?: string;
};

export type MessageMetadata = {
	sentiment: string;
	urgency: string;
	relationshipStage: string;
	topics: string[];
	personalDetailsMentioned: string[];
	sentimentClass?: string;
	category?: string;
	businessValue?: number;
	responseTimeMinutes?: number | null;
};

export type RelationshipScoring = {
	communicationFrequency: number;
	sentimentTrend: string;
	engagementLevel: string;
	daysSinceLastContact: number;
};

/** Canonical email message — plain text, no format-specific encoding. */
export type EmailCanonical = {
	from: string;
	to: string;
	fromName: string;
	fromEmail: string;
	toName: string;
	toEmail: string;
	subject: string;
	body: string;
	date: string;
};

/** Canonical calendar event. */
export type CalendarCanonical = {
	summary: string;
	description: string;
	location?: string;
	organizerEmail: string;
	organizerName: string;
	date: string;
};

export type TimelineMessage = {
	canonical: EmailCanonical | CalendarCanonical;
	metadata: MessageMetadata;
};

export type TimelineGroup = {
	groupId: string;
	title: string;
	messages: TimelineMessage[];
	relationshipScoring?: RelationshipScoring;
};

export type GenerateSummary = {
	totalMessages: number;
	timespanDays: number;
	sentimentProgression: string[];
	arcDescription: string;
};

export type GenerateData = {
	domain: Domain;
	timeline: TimelineGroup[];
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
	domain?: Domain;
	model?: string;
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
	if (persona.personality) result.personality = persona.personality;
	if (personalDetails?.length) result.personalDetails = personalDetails;
	if (persona.signature) result.signature = persona.signature;
	return result;
}

/** Format minutes into a human-readable duration like "4h 2m" or "3d 12h". */
export function formatResponseTime(minutes: number): string {
	if (minutes < 60) return `${minutes}m`;
	if (minutes < 1440) {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}
	const d = Math.floor(minutes / 1440);
	const h = Math.floor((minutes % 1440) / 60);
	return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

/** Check if a canonical object is an email (has subject + from fields). */
export function isEmailCanonical(c: EmailCanonical | CalendarCanonical): c is EmailCanonical {
	return 'subject' in c && 'from' in c;
}

/** Fetch available domains from the backend. */
export async function fetchDomains(): Promise<Domain[]> {
	try {
		const baseUrl = PUBLIC_GENERATE_URL.replace(/\/generate\/?$/, '');
		const res = await fetch(`${baseUrl}/formats`);
		if (!res.ok) return ['email'];
		const json = await res.json();
		return json.domains ?? ['email'];
	} catch {
		return ['email'];
	}
}

export async function generate(request: GenerateRequest): Promise<GenerateResult> {
	try {
		const body: Record<string, unknown> = {
			personas: request.personas,
			relationship: request.relationship,
		};

		if (request.domain && request.domain !== 'email') body.domain = request.domain;
		if (request.arc) body.arc = request.arc;
		if (request.threadCount !== undefined) body.threadCount = request.threadCount;
		if (request.timespan) body.timespan = request.timespan;
		if (request.model) body.model = request.model;

		const response = await fetch(PUBLIC_GENERATE_URL, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			return {success: false, error: `Server error: ${response.status} ${response.statusText}`};
		}

		const json = await response.json();
		const data = json.data ?? json;
		if (!data.domain) data.domain = 'email';
		return {success: true, data, id: json.id};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : 'Unknown error'};
	}
}
