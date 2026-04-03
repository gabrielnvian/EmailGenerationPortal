import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
	PUBLIC_GENERATE_URL: 'https://example.com/generate'
}));

import { listGenerations, getGeneration, deleteGeneration, getGenerationRaw } from './generations';

beforeEach(() => {
	vi.restoreAllMocks();
});

function mockFetch(body: unknown, ok = true, status = 200) {
	const fn = vi.fn().mockResolvedValue({
		ok,
		status,
		statusText: ok ? 'OK' : 'Server Error',
		json: () => Promise.resolve(body)
	});
	vi.stubGlobal('fetch', fn);
	return fn;
}

describe('listGenerations', () => {
	it('fetches GET /generations with no params', async () => {
		const fetchMock = mockFetch({ success: true, total: 0, data: [] });
		await listGenerations();
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/generations');
	});

	it('appends query params', async () => {
		const fetchMock = mockFetch({ success: true, total: 0, data: [] });
		await listGenerations({ q: 'HVAC', persona: 'Collin', sentiment: 'tense', limit: 10, offset: 20 });
		const url = fetchMock.mock.calls[0][0];
		expect(url).toContain('q=HVAC');
		expect(url).toContain('persona=Collin');
		expect(url).toContain('sentiment=tense');
		expect(url).toContain('limit=10');
		expect(url).toContain('offset=20');
	});

	it('returns data and total on success', async () => {
		const row = { id: 1, persona_0_name: 'Alice', relationship: 'test' };
		mockFetch({ success: true, total: 42, data: [row] });
		const result = await listGenerations();
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.total).toBe(42);
			expect(result.data).toHaveLength(1);
			expect(result.data[0].id).toBe(1);
		}
	});

	it('returns error on non-ok response', async () => {
		mockFetch({}, false, 500);
		const result = await listGenerations();
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('500');
	});

	it('returns error on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		const result = await listGenerations();
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('offline');
	});
});

describe('getGeneration', () => {
	it('fetches GET /generations/:id', async () => {
		const fetchMock = mockFetch({ success: true, data: { id: 7 } });
		await getGeneration(7);
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/generations/7');
	});

	it('returns detail on success', async () => {
		const detail = { id: 7, relationship: 'test', response: { timeline: [], summary: {} } };
		mockFetch({ success: true, data: detail });
		const result = await getGeneration(7);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.id).toBe(7);
	});

	it('returns error on 404', async () => {
		mockFetch({}, false, 404);
		const result = await getGeneration(999);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('404');
	});
});

describe('deleteGeneration', () => {
	it('sends DELETE /generations/:id', async () => {
		const fetchMock = mockFetch({ success: true });
		await deleteGeneration(5);
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/generations/5', { method: 'DELETE' });
	});

	it('returns success on ok response', async () => {
		mockFetch({ success: true });
		const result = await deleteGeneration(5);
		expect(result).toEqual({ success: true });
	});

	it('returns error on 404', async () => {
		mockFetch({}, false, 404);
		const result = await deleteGeneration(999);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('404');
	});
});

describe('getGenerationRaw', () => {
	it('fetches GET /generations/:id with no view param', async () => {
		const fetchMock = mockFetch({ data: { timeline: [] } });
		await getGenerationRaw(7);
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/generations/7');
	});

	it('fetches GET /generations/:id?view=gmail', async () => {
		const fetchMock = mockFetch({ data: { messages: [] } });
		await getGenerationRaw(7, 'gmail');
		expect(fetchMock).toHaveBeenCalledWith('https://example.com/generations/7?view=gmail');
	});

	it('returns raw data on success', async () => {
		const payload = { data: { timeline: [] }, wrapped: {} };
		mockFetch(payload);
		const result = await getGenerationRaw(3);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual(payload);
	});

	it('returns error text on non-ok response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: false, status: 400, statusText: 'Bad Request',
			text: () => Promise.resolve('gmail view is not available for calendar domain'),
		}));
		const result = await getGenerationRaw(5, 'gmail');
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('gmail view is not available');
	});

	it('returns error on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		const result = await getGenerationRaw(1);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toBe('offline');
	});
});
