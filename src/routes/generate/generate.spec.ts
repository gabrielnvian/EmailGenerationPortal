import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
	PUBLIC_GENERATE_URL: 'https://n8n.tail068f9.ts.net:4443/generate'
}));

import { generateEmails, personaToGeneratePersona, decodeEmailBody, getHeader, formatResponseTime, type GenerateRequest, type GmailMessage } from './generate';
import { Persona } from '../../personas.model';

const collin = new Persona(1, 'Collin Weirs', 'Sculptor', 'Statues Inc.', 'Decoration', '9257674434', 'collin@statuesinc.com');
const boss = new Persona(99, 'Big Boss', 'CEO', 'Statues Inc.', 'Decoration', '9250000000', 'boss@statuesinc.com');

const baseRequest: GenerateRequest = {
	personas: [
		{ name: 'Collin Weirs', email: 'collin@statuesinc.com', jobTitle: 'Sculptor', company: 'Statues Inc.' },
		{ name: 'Samantha Lee', email: 'samantha@northlineair.com', jobTitle: 'Support Lead', company: 'Northline Air' }
	],
	relationship: 'new client, first HVAC project together'
};

const mockResponse = {
	timeline: [{
		threadId: 'abc123',
		subject: 'HVAC Assessment',
		messages: [{
			gmail: {
				id: '1',
				threadId: 'abc123',
				labelIds: ['SENT'],
				snippet: 'Hi Samantha...',
				payload: {
					headers: [
						{ name: 'From', value: 'Collin Weirs <collin@statuesinc.com>' },
						{ name: 'To', value: 'Samantha Lee <samantha@northlineair.com>' },
						{ name: 'Date', value: 'Mon, 15 Jan 2024 09:30:00 GMT' }
					],
					body: { size: 11, data: 'SGVsbG8gV29ybGQ' }
				}
			},
			metadata: {
				sentiment: 'positive',
				urgency: 'low',
				relationshipStage: 'introduction',
				topics: ['project kickoff'],
				personalDetailsMentioned: []
			}
		}]
	}],
	summary: {
		totalMessages: 1,
		timespanDays: 58,
		sentimentProgression: ['positive'],
		arcDescription: 'Professional introduction'
	}
};

function mockFetch(response = mockResponse) {
	const fn = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(response) });
	vi.stubGlobal('fetch', fn);
	return fn;
}

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('personaToGeneratePersona', () => {
	it('maps core fields from Persona', () => {
		const result = personaToGeneratePersona(collin);
		expect(result).toEqual({
			name: 'Collin Weirs',
			email: 'collin@statuesinc.com',
			jobTitle: 'Sculptor',
			company: 'Statues Inc.',
			field: 'Decoration',
			phone: '9257674434',
		});
	});

	it('includes tone and personalDetails when provided', () => {
		const result = personaToGeneratePersona(collin, 'casual, direct', ['birthday Oct 12', 'has a dog named Marble']);
		expect(result.tone).toBe('casual, direct');
		expect(result.personalDetails).toEqual(['birthday Oct 12', 'has a dog named Marble']);
	});

	it('omits tone and personalDetails when empty', () => {
		const result = personaToGeneratePersona(collin, '', []);
		expect(result.tone).toBeUndefined();
		expect(result.personalDetails).toBeUndefined();
	});

	it('omits field and phone when empty on the Persona', () => {
		const noExtras = new Persona(3, 'Test', 'Dev', 'Co', '', '', 'test@co.com');
		const result = personaToGeneratePersona(noExtras);
		expect(result.field).toBeUndefined();
		expect(result.phone).toBeUndefined();
	});

	it('excludes supervisor from the output', () => {
		const withBoss = new Persona(1, 'Collin Weirs', 'Sculptor', 'Statues Inc.', 'Decoration', '9257674434', 'collin@statuesinc.com', boss);
		const result = personaToGeneratePersona(withBoss);
		expect(result).not.toHaveProperty('supervisor');
		expect(result).not.toHaveProperty('supervisorId');
		expect(result).not.toHaveProperty('id');
	});
});

describe('formatResponseTime', () => {
	it('formats minutes under an hour', () => {
		expect(formatResponseTime(42)).toBe('42m');
	});

	it('formats hours and minutes', () => {
		expect(formatResponseTime(242)).toBe('4h 2m');
	});

	it('formats exact hours', () => {
		expect(formatResponseTime(180)).toBe('3h');
	});

	it('formats days and hours', () => {
		expect(formatResponseTime(2160)).toBe('1d 12h');
	});

	it('formats exact days', () => {
		expect(formatResponseTime(2880)).toBe('2d');
	});
});

describe('decodeEmailBody', () => {
	it('decodes base64url to plain text', () => {
		expect(decodeEmailBody('SGVsbG8gV29ybGQ')).toBe('Hello World');
	});

	it('handles base64url characters (- and _)', () => {
		// base64url uses - instead of + and _ instead of /
		expect(decodeEmailBody('SGVsbG8-V29ybGQ_')).toBe(decodeEmailBody('SGVsbG8+V29ybGQ/'));
	});

	it('returns raw string on decode failure', () => {
		expect(decodeEmailBody('%%%invalid')).toBe('%%%invalid');
	});
});

describe('getHeader', () => {
	const gmail = mockResponse.timeline[0].messages[0].gmail as unknown as GmailMessage;

	it('extracts a header by name (case-insensitive)', () => {
		expect(getHeader(gmail, 'from')).toBe('Collin Weirs <collin@statuesinc.com>');
		expect(getHeader(gmail, 'From')).toBe('Collin Weirs <collin@statuesinc.com>');
	});

	it('returns empty string for missing headers', () => {
		expect(getHeader(gmail, 'X-Custom')).toBe('');
	});
});

describe('generateEmails', () => {
	it('sends POST to the generate URL with correct headers', async () => {
		const fetchMock = mockFetch();
		await generateEmails(baseRequest);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://n8n.tail068f9.ts.net:4443/generate',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			})
		);
	});

	it('sends personas as proper objects, not stringified', async () => {
		const fetchMock = mockFetch();
		await generateEmails(baseRequest);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.personas).toEqual(baseRequest.personas);
		expect(typeof body.personas[0]).toBe('object');
	});

	it('sends relationship in the body', async () => {
		const fetchMock = mockFetch();
		await generateEmails(baseRequest);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.relationship).toBe('new client, first HVAC project together');
	});

	it('includes arc, threadCount, timespan when provided', async () => {
		const fetchMock = mockFetch();
		await generateEmails({
			...baseRequest,
			arc: 'starts professional, resolves amicably',
			threadCount: 5,
			timespan: '2 months'
		});
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.arc).toBe('starts professional, resolves amicably');
		expect(body.threadCount).toBe(5);
		expect(body.timespan).toBe('2 months');
	});

	it('omits optional fields when not provided', async () => {
		const fetchMock = mockFetch();
		await generateEmails(baseRequest);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.arc).toBeUndefined();
		expect(body.threadCount).toBeUndefined();
		expect(body.timespan).toBeUndefined();
	});

	it('does not send old fields (idea, from, to, count, length, emailCount, fromField, toField)', async () => {
		const fetchMock = mockFetch();
		await generateEmails({ ...baseRequest, arc: 'test', threadCount: 5, timespan: '1 month' });
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		for (const removed of ['idea', 'from', 'to', 'count', 'length', 'emailCount', 'fromField', 'toField']) {
			expect(body).not.toHaveProperty(removed);
		}
	});

	it('returns success with timeline data', async () => {
		mockFetch();
		const result = await generateEmails(baseRequest);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.timeline).toHaveLength(1);
			expect(result.data.timeline[0].subject).toBe('HVAC Assessment');
			expect(result.data.summary.totalMessages).toBe(1);
			expect(result.data.summary.timespanDays).toBe(58);
		}
	});

	it('returns error with status on non-ok response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' }));
		const result = await generateEmails(baseRequest);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('500');
	});

	it('returns error message on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
		const result = await generateEmails(baseRequest);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('Network failure');
	});
});
