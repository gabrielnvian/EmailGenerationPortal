import {Persona} from "../../personas.model";
import {PUBLIC_GENERATE_URL} from '$env/static/public';

export type OutputFormat = 'gmail' | 'outlook' | 'gcal';

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

export type OutlookMessage = {
	id: string;
	conversationId: string;
	subject: string;
	importance: string;
	isRead: boolean;
	from: { emailAddress: { name: string; address: string } };
	toRecipients: { emailAddress: { name: string; address: string } }[];
	body: { contentType: string; content: string };
	receivedDateTime: string;
	[key: string]: unknown;
};

export type GCalEvent = {
	id: string;
	summary: string;
	description: string;
	start: { dateTime: string };
	end: { dateTime: string };
	attendees?: { email: string; displayName?: string; responseStatus?: string }[];
	location?: string;
	conferenceData?: { entryPoints?: { uri: string; entryPointType: string }[] };
	[key: string]: unknown;
};

export type TimelineMessage = {
	output: GmailMessage | OutlookMessage | GCalEvent | Record<string, unknown>;
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
	format: OutputFormat;
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
	format?: OutputFormat;
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

/** Decode base64url email body to plain text. */
export function decodeEmailBody(data: string): string {
	try {
		const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
		return atob(base64);
	} catch {
		return data;
	}
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

/** Extract a header value from a Gmail message. */
export function getGmailHeader(msg: GmailMessage, name: string): string {
	return msg.payload?.headers?.find(
		(h: GmailHeader) => h.name.toLowerCase() === name.toLowerCase()
	)?.value ?? '';
}

/** Extract sender/recipient/date from any format output. */
export function extractMessageInfo(output: Record<string, unknown>, format: OutputFormat): { from: string; to: string; date: string; subject: string; body: string } {
	if (format === 'gmail') {
		const gmail = output as GmailMessage;
		return {
			from: getGmailHeader(gmail, 'From'),
			to: getGmailHeader(gmail, 'To'),
			date: getGmailHeader(gmail, 'Date'),
			subject: getGmailHeader(gmail, 'Subject'),
			body: decodeEmailBody(gmail.payload?.body?.data ?? ''),
		};
	}
	if (format === 'outlook') {
		const msg = output as OutlookMessage;
		const fromAddr = msg.from?.emailAddress;
		const toAddr = msg.toRecipients?.[0]?.emailAddress;
		return {
			from: fromAddr ? `${fromAddr.name} <${fromAddr.address}>` : '',
			to: toAddr ? `${toAddr.name} <${toAddr.address}>` : '',
			date: msg.receivedDateTime ?? '',
			subject: msg.subject ?? '',
			body: msg.body?.content ?? '',
		};
	}
	// gcal
	const evt = output as GCalEvent;
	const attendeeList = evt.attendees?.map(a => a.displayName || a.email).join(', ') ?? '';
	return {
		from: '',
		to: attendeeList,
		date: evt.start?.dateTime ?? '',
		subject: evt.summary ?? '',
		body: evt.description ?? '',
	};
}

/** Check if message was sent by the inbox owner (persona 0). */
export function isSentByOwner(output: Record<string, unknown>, format: OutputFormat): boolean {
	if (format === 'gmail') {
		return (output as GmailMessage).labelIds?.includes('SENT') ?? false;
	}
	if (format === 'outlook') {
		// Outlook sent items have a sentDateTime but no receivedDateTime, or folder is sentItems
		// For now, check if it looks like a sent item based on available fields
		return (output as Record<string, unknown>).parentFolderId === 'sentitems' ||
			(output as Record<string, unknown>).isDraft === false && !(output as OutlookMessage).isRead;
	}
	return false; // gcal doesn't have sent/received concept
}

/** Check if a received message is unread. */
export function isUnread(output: Record<string, unknown>, format: OutputFormat): boolean {
	if (format === 'gmail') {
		return (output as GmailMessage).labelIds?.includes('UNREAD') ?? false;
	}
	if (format === 'outlook') {
		return !(output as OutlookMessage).isRead;
	}
	return false;
}

/** Fetch available output formats from the backend. */
export async function fetchFormats(): Promise<OutputFormat[]> {
	try {
		const baseUrl = PUBLIC_GENERATE_URL.replace(/\/generate\/?$/, '');
		const res = await fetch(`${baseUrl}/formats`);
		if (!res.ok) return ['gmail'];
		const json = await res.json();
		return json.data ?? ['gmail'];
	} catch {
		return ['gmail'];
	}
}

export async function generateEmails(request: GenerateRequest): Promise<GenerateResult> {
	try {
		const body: Record<string, unknown> = {
			personas: request.personas,
			relationship: request.relationship,
		};

		if (request.format && request.format !== 'gmail') body.format = request.format;
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
		const data = json.data ?? json;
		// Ensure format is set
		if (!data.format) data.format = 'gmail';
		return {success: true, data, id: json.id};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : 'Unknown error'};
	}
}
