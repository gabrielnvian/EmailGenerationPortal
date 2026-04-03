import {PUBLIC_GENERATE_URL} from '$env/static/public';
import type {GenerateData, Domain} from '../generate/generate';

/** Derive the API base from the generate URL (strip /generate suffix). */
const API_BASE = PUBLIC_GENERATE_URL.replace(/\/generate\/?$/, '');

// ── Types ────────────────────────────────────────────────

export type GenerationSummaryRow = {
	id: number;
	created_at: string;
	domain: Domain;
	persona_0_name: string;
	persona_0_email: string;
	persona_1_name: string;
	persona_1_email: string;
	relationship: string;
	arc: string;
	thread_count: number;
	message_count: number;
	timespan_days: number;
	duration_ms: number;
	model: string | null;
};

export type GenerationDetail = GenerationSummaryRow & {
	request: Record<string, unknown>;
	response: GenerateData;
};

export type ListParams = {
	q?: string;
	persona?: string;
	sentiment?: string;
	domain?: string;
	limit?: number;
	offset?: number;
};

type ListResult =
	{ success: true; total: number; data: GenerationSummaryRow[] } |
	{ success: false; error: string };

type DetailResult =
	{ success: true; data: GenerationDetail } |
	{ success: false; error: string };

type DeleteResult =
	{ success: true } |
	{ success: false; error: string };

// ── API functions ────────────────────────────────────────

export async function listGenerations(params: ListParams = {}): Promise<ListResult> {
	try {
		const query = new URLSearchParams();
		if (params.q) query.set('q', params.q);
		if (params.persona) query.set('persona', params.persona);
		if (params.sentiment) query.set('sentiment', params.sentiment);
		if (params.domain) query.set('domain', params.domain);
		if (params.limit !== undefined) query.set('limit', String(params.limit));
		if (params.offset !== undefined) query.set('offset', String(params.offset));

		const qs = query.toString();
		const url = `${API_BASE}/generations${qs ? `?${qs}` : ''}`;

		const res = await fetch(url);
		if (!res.ok) {
			return {success: false, error: `Server error: ${res.status} ${res.statusText}`};
		}
		const json = await res.json();
		return {success: true, total: json.total ?? 0, data: json.data ?? []};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : 'Unknown error'};
	}
}

export async function getGeneration(id: number): Promise<DetailResult> {
	try {
		const res = await fetch(`${API_BASE}/generations/${id}`);
		if (!res.ok) {
			return {success: false, error: `Server error: ${res.status} ${res.statusText}`};
		}
		const json = await res.json();
		return {success: true, data: json.data};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : 'Unknown error'};
	}
}

export type ViewType = 'metadata' | 'gmail' | 'outlook' | 'gcal';

type RawViewResult =
	{ success: true; data: unknown } |
	{ success: false; error: string };

export async function getGenerationRaw(id: number, view?: ViewType): Promise<RawViewResult> {
	try {
		const query = view ? `?view=${view}` : '';
		const res = await fetch(`${API_BASE}/generations/${id}${query}`);
		if (!res.ok) {
			const body = await res.text();
			return {success: false, error: body || `Server error: ${res.status} ${res.statusText}`};
		}
		const json = await res.json();
		return {success: true, data: json};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : 'Unknown error'};
	}
}

export async function deleteGeneration(id: number): Promise<DeleteResult> {
	try {
		const res = await fetch(`${API_BASE}/generations/${id}`, {method: 'DELETE'});
		if (!res.ok) {
			return {success: false, error: `Server error: ${res.status} ${res.statusText}`};
		}
		return {success: true};
	} catch (e) {
		return {success: false, error: e instanceof Error ? e.message : 'Unknown error'};
	}
}
