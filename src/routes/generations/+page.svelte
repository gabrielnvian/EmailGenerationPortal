<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from "$app/paths";
	import {listGenerations, type GenerationSummaryRow, type ListParams} from "./generations";

	let query = "";
	let personaFilter = "";
	let sentimentFilter = "";
	let rows: GenerationSummaryRow[] = [];
	let total = 0;
	let offset = 0;
	const limit = 20;

	let loading = false;
	let error = '';

	async function search() {
		loading = true;
		error = '';
		offset = 0;
		await load();
	}

	async function load() {
		loading = true;
		error = '';

		const params: ListParams = {limit, offset};
		if (query.trim()) params.q = query.trim();
		if (personaFilter.trim()) params.persona = personaFilter.trim();
		if (sentimentFilter.trim()) params.sentiment = sentimentFilter.trim();

		const result = await listGenerations(params);
		if (result.success) {
			rows = result.data;
			total = result.total;
		} else {
			error = result.error;
		}
		loading = false;
	}

	function nextPage() {
		if (offset + limit < total) {
			offset += limit;
			load();
		}
	}

	function prevPage() {
		if (offset > 0) {
			offset = Math.max(0, offset - limit);
			load();
		}
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		const s = Math.round(ms / 1000);
		if (s < 60) return `${s}s`;
		return `${Math.floor(s / 60)}m ${s % 60}s`;
	}

	function formatDate(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
		} catch {
			return dateStr;
		}
	}

	// Load initial data
	load();
</script>

<div class="flex flex-col gap-8">
	<!-- Header -->
	<div class="flex flex-col gap-2 pt-4">
		<button class="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors w-fit" on:click={() => goto(`${base}/`)}>
			← Back
		</button>
		<h1 class="text-4xl font-black tracking-tight">Past Generations</h1>
		<p class="text-white/60 text-sm">Search and browse previously generated email timelines.</p>
		<div class="divider-glow"></div>
	</div>

	<!-- Search / Filters -->
	<div class="surface p-5 flex flex-col gap-4">
		<div class="flex gap-2">
			<input
				class="field flex-1"
				placeholder="Search relationship, arc, or persona names..."
				bind:value={query}
				on:keydown={(e) => e.key === 'Enter' && search()}
			/>
			<button class="btn btn-primary btn-sm rounded-xl flex-shrink-0" on:click={search}>Search</button>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<input
				class="field text-sm"
				placeholder="Filter by persona name or email"
				bind:value={personaFilter}
				on:keydown={(e) => e.key === 'Enter' && search()}
			/>
			<input
				class="field text-sm"
				placeholder="Filter by sentiment (e.g. tense, rapport)"
				bind:value={sentimentFilter}
				on:keydown={(e) => e.key === 'Enter' && search()}
			/>
		</div>
	</div>

	<!-- Status -->
	{#if loading}
		<div class="flex items-center gap-2.5 text-sm text-white/60">
			<span class="loading loading-spinner loading-sm" style="color:#00f9cf;"></span>
			Loading...
		</div>
	{:else if error}
		<div class="alert-error">{error}</div>
	{/if}

	<!-- Results -->
	{#if !loading && rows.length > 0}
		<div class="flex flex-col gap-3">
			{#each rows as row (row.id)}
				<button
					class="surface-interactive p-5 flex flex-col gap-3 text-left w-full"
					on:click={() => goto(`${base}/generations/${row.id}/`)}
				>
					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-3 min-w-0">
							<span class="text-xs text-white/30 font-mono">#{row.id}</span>
							<span class="text-sm font-semibold text-white truncate">{row.persona_0_name}</span>
							<span class="text-xs text-white/30">↔</span>
							<span class="text-sm font-semibold text-white truncate">{row.persona_1_name}</span>
						</div>
						<span class="text-xs text-white/30 flex-shrink-0">{formatDate(row.created_at)}</span>
					</div>
					<p class="text-sm text-white/60 truncate">{row.relationship}</p>
					{#if row.arc}
						<p class="text-xs text-white/40 truncate">{row.arc}</p>
					{/if}
					<div class="flex flex-wrap gap-3 text-xs text-white/40">
						<span>{row.thread_count} thread{row.thread_count === 1 ? '' : 's'}</span>
						<span>{row.message_count} message{row.message_count === 1 ? '' : 's'}</span>
						<span>{row.timespan_days} days</span>
						<span>{formatDuration(row.duration_ms)}</span>
					</div>
				</button>
			{/each}
		</div>

		<!-- Pagination -->
		{#if total > limit}
			<div class="flex items-center justify-between text-xs text-white/40">
				<span>Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
				<div class="flex gap-2">
					<button class="btn-glass text-xs py-1 px-3" disabled={offset === 0} on:click={prevPage}>← Prev</button>
					<button class="btn-glass text-xs py-1 px-3" disabled={offset + limit >= total} on:click={nextPage}>Next →</button>
				</div>
			</div>
		{/if}
	{:else if !loading && !error}
		<p class="text-center text-white/30 text-sm py-12">No generations found.</p>
	{/if}
</div>
