import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queueEmails, coldStart } from './generate';
import { Persona } from '../../personas.model';

const alice = new Persona('Alice', 'Engineer', 'Acme', 'Tech', '555-0001', 'alice@acme.com');
const bob = new Persona('Bob', 'Manager', 'Acme', 'Tech', '555-0002', 'bob@acme.com');

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('queueEmails', () => {
	it('returns success on ok response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		const result = await queueEmails('Tech', 'Tech', 'Hello', [alice], [bob], 1, 300, 1);
		expect(result).toEqual({ success: true });
	});

	it('sends POST to version 1 URL', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
		await queueEmails('Tech', 'Tech', 'Hello', [alice], [bob], 1, 300, 1);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://n8n.tail068f9.ts.net/webhook/generate-email',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('sends POST to version 2 URL', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
		await queueEmails('Tech', 'Tech', 'Hello', [alice], [bob], 1, 300, 2);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://n8n.tail068f9.ts.net/webhook/3726feba-2e41-424a-a5d9-04713248c600',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('serializes personas as JSON strings in the request body', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
		await queueEmails('Tech', 'Tech', 'Hello', [alice], [bob], 1, 300, 1);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.from).toEqual([JSON.stringify(alice)]);
		expect(body.to).toEqual([JSON.stringify(bob)]);
	});

	it('sends correct payload fields', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
		await queueEmails('FromField', 'ToField', 'My idea', [alice], [bob], 3, 500, 1);
		const body = JSON.parse(fetchMock.mock.calls[0][1].body);
		expect(body.fromField).toBe('FromField');
		expect(body.toField).toBe('ToField');
		expect(body.idea).toBe('My idea');
		expect(body.emailCount).toBe(3);
		expect(body.length).toBe(500);
	});

	it('returns error with status on non-ok response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' }));
		const result = await queueEmails('Tech', 'Tech', 'Hello', [alice], [bob], 1, 300, 1);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('500');
	});

	it('returns error message on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
		const result = await queueEmails('Tech', 'Tech', 'Hello', [alice], [bob], 1, 300, 1);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('Network failure');
	});
});

describe('coldStart', () => {
	it('returns success on ok response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		expect(await coldStart()).toEqual({ success: true });
	});

	it('sends POST to the cold start URL', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
		await coldStart();
		expect(fetchMock).toHaveBeenCalledWith(
			'https://n8n.tail068f9.ts.net/webhook/ollama-cold-start',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('returns error with status on non-ok response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' }));
		const result = await coldStart();
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('503');
	});

	it('returns error message on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));
		const result = await coldStart();
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('Connection refused');
	});
});
