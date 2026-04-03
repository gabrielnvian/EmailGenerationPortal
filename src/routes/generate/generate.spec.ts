import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
	PUBLIC_GENERATE_URL: 'https://n8n.tail068f9.ts.net:10000/generate'
}));

import { generate, personaToGeneratePersona, formatResponseTime, isEmailCanonical, type GenerateRequest } from './generate';
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

const mockEmailResponse = {
	domain: 'email',
	timeline: [{
		groupId: 'abc123',
		title: 'HVAC Assessment',
		messages: [{
			canonical: {
				from: 'Collin Weirs <collin@statuesinc.com>',
				to: 'Samantha Lee <samantha@northlineair.com>',
				fromName: 'Collin Weirs',
				fromEmail: 'collin@statuesinc.com',
				toName: 'Samantha Lee',
				toEmail: 'samantha@northlineair.com',
				subject: 'HVAC Assessment',
				body: 'Hi Samantha,\n\nI wanted to follow up...\n\nBest,\nCollin',
				date: '2024-01-15T09:30:00.000Z'
			},
			metadata: {
				sentiment: 'positive',
				urgency: 'low',
				relationshipStage: 'introduction',
				topics: ['project kickoff'],
				personalDetailsMentioned: [],
				category: 'initial-outreach'
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

const mockCalendarResponse = {
	domain: 'calendar',
	timeline: [{
		groupId: 'evt1',
		title: 'Q1 Planning Review',
		messages: [{
			canonical: {
				summary: 'Q1 Planning Review',
				description: 'Review Q1 results and plan Q2.',
				location: 'Google Meet',
				organizerEmail: 'collin@statuesinc.com',
				organizerName: 'Collin Weirs',
				date: '2024-03-15T14:00:00.000Z'
			},
			metadata: {
				sentiment: 'neutral',
				urgency: 'low',
				relationshipStage: 'collaborating',
				topics: ['planning'],
				personalDetailsMentioned: [],
				category: 'status-review'
			}
		}]
	}],
	summary: {
		totalMessages: 1,
		timespanDays: 30,
		sentimentProgression: ['neutral'],
		arcDescription: 'Quarterly planning'
	}
};

function mockFetch(response = mockEmailResponse) {
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
		const result = personaToGeneratePersona(collin, 'casual, direct', ['birthday Oct 12']);
		expect(result.tone).toBe('casual, direct');
		expect(result.personalDetails).toEqual(['birthday Oct 12']);
	});

	it('omits tone and personalDetails when empty', () => {
		const result = personaToGeneratePersona(collin, '', []);
		expect(result.tone).toBeUndefined();
		expect(result.personalDetails).toBeUndefined();
	});

	it('excludes supervisor, supervisorId, and id from the output', () => {
		const withBoss = new Persona(1, 'Collin Weirs', 'Sculptor', 'Statues Inc.', 'Decoration', '9257674434', 'collin@statuesinc.com', boss);
		const result = personaToGeneratePersona(withBoss);
		expect(result).not.toHaveProperty('supervisor');
		expect(result).not.toHaveProperty('supervisorId');
		expect(result).not.toHaveProperty('id');
	});
});

describe('formatResponseTime', () => {
	it('formats minutes under an hour', () => { expect(formatResponseTime(42)).toBe('42m'); });
	it('formats hours and minutes', () => { expect(formatResponseTime(242)).toBe('4h 2m'); });
	it('formats exact hours', () => { expect(formatResponseTime(180)).toBe('3h'); });
	it('formats days and hours', () => { expect(formatResponseTime(2160)).toBe('1d 12h'); });
	it('formats exact days', () => { expect(formatResponseTime(2880)).toBe('2d'); });
});

describe('isEmailCanonical', () => {
	it('returns true for email canonical objects', () => {
		expect(isEmailCanonical(mockEmailResponse.timeline[0].messages[0].canonical as any)).toBe(true);
	});

	it('returns false for calendar canonical objects', () => {
		expect(isEmailCanonical(mockCalendarResponse.timeline[0].messages[0].canonical as any)).toBe(false);
	});
});

describe('generate', () => {
	it('sends POST to the generate URL', async () => {
		const fetchMock = mockFetch();
		await generate(baseRequest);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://n8n.tail068f9.ts.net:10000/generate',
			expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' } })
		);
	});

	it('sends domain when not email', async () => {
		const fetchMock = mockFetch(mockCalendarResponse);
		await generate({ ...baseRequest, domain: 'calendar' });
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.domain).toBe('calendar');
	});

	it('omits domain when email (default)', async () => {
		const fetchMock = mockFetch();
		await generate({ ...baseRequest, domain: 'email' });
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.domain).toBeUndefined();
	});

	it('includes arc, threadCount, timespan when provided', async () => {
		const fetchMock = mockFetch();
		await generate({ ...baseRequest, arc: 'test arc', threadCount: 5, timespan: '2 months' });
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.arc).toBe('test arc');
		expect(body.threadCount).toBe(5);
		expect(body.timespan).toBe('2 months');
	});

	it('returns success with canonical email data', async () => {
		mockFetch();
		const result = await generate(baseRequest);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.domain).toBe('email');
			expect(result.data.timeline[0].title).toBe('HVAC Assessment');
			expect(result.data.timeline[0].messages[0].canonical).toHaveProperty('subject');
			expect(result.data.timeline[0].messages[0].canonical).toHaveProperty('body');
			expect(result.data.timeline[0].messages[0].metadata.category).toBe('initial-outreach');
		}
	});

	it('returns success with canonical calendar data', async () => {
		mockFetch(mockCalendarResponse);
		const result = await generate({ ...baseRequest, domain: 'calendar' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.domain).toBe('calendar');
			expect(result.data.timeline[0].messages[0].canonical).toHaveProperty('summary');
			expect(result.data.timeline[0].messages[0].canonical).toHaveProperty('description');
		}
	});

	it('returns error on non-ok response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' }));
		const result = await generate(baseRequest);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('500');
	});

	it('returns error on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
		const result = await generate(baseRequest);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('Network failure');
	});
});
