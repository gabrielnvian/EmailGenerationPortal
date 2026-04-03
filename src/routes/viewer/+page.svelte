<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from "$app/paths";
	import {onMount} from "svelte";
	import {
		listGenerations,
		getGenerationRaw,
		type GenerationSummaryRow,
		type ViewType,
	} from "../generations/generations";

	// --- Generation list ---
	let generations: GenerationSummaryRow[] = [];
	let loadingList = true;
	let listError = '';

	// --- Selection state ---
	let selectedId: number | null = null;
	let selectedView: string = '';

	// --- Derived ---
	$: selectedGen = generations.find(g => g.id === selectedId) ?? null;
	$: domain = selectedGen?.domain ?? 'email';

	$: viewOptions = buildViewOptions(domain);

	function buildViewOptions(d: string): { value: string; label: string }[] {
		const opts = [
			{ value: '',         label: 'Random format' },
			{ value: 'metadata', label: 'Metadata only' },
		];
		if (d === 'email') {
			opts.push({ value: 'gmail',   label: 'Gmail API format' });
			opts.push({ value: 'outlook', label: 'Outlook API format' });
		}
		if (d === 'calendar') {
			opts.push({ value: 'gcal', label: 'Google Calendar format' });
		}
		return opts;
	}

	// --- Fetch result ---
	let fetching = false;
	let fetchError = '';
	let rawJson = '';
	let copied = false;

	// --- Reset on generation change ---
	let prevId: number | null = null;
	$: if (selectedId !== prevId) {
		prevId = selectedId;
		selectedView = '';
		rawJson = '';
		fetchError = '';
	}

	onMount(async () => {
		const result = await listGenerations({ limit: 200 });
		if (result.success) {
			generations = result.data;
		} else {
			listError = result.error;
		}
		loadingList = false;
	});

	async function handleFetch() {
		if (selectedId === null) return;
		fetching = true;
		fetchError = '';
		rawJson = '';
		copied = false;

		const view = selectedView ? (selectedView as ViewType) : undefined;
		const result = await getGenerationRaw(selectedId, view);

		if (result.success) {
			rawJson = JSON.stringify(result.data, null, 2);
		} else {
			fetchError = result.error;
		}
		fetching = false;
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(rawJson);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		} catch {
			// ignore
		}
	}
</script>

<div class="flex flex-col gap-8">
	<!-- Header -->
	<div class="flex flex-col gap-2 pt-4">
		<button class="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors w-fit" on:click={() => goto(`${base}/`)}>
			← Back
		</button>
		<h1 class="text-4xl font-black tracking-tight">API Viewer</h1>
		<p class="text-white/60 text-sm">Inspect raw API responses for any generation.</p>
		<div class="divider-glow"></div>
	</div>

	<!-- Controls -->
	<div class="surface p-5 flex flex-col gap-4">
		<div class="section-label section-label--cyan">Select generation & view</div>

		{#if loadingList}
			<div class="flex items-center gap-2.5 text-sm text-white/60">
				<span class="loading loading-spinner loading-sm" style="color:#00f9cf;"></span>
				Loading generations...
			</div>
		{:else if listError}
			<div class="alert-error">{listError}</div>
		{:else}
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5">
					<label class="text-xs text-white/70 font-medium" for="gen-select">Generation</label>
					<select id="gen-select" class="field" bind:value={selectedId}>
						<option value={null}>Choose a generation...</option>
						{#each generations as g (g.id)}
							<option value={g.id}>#{g.id} · {g.persona_0_name} ↔ {g.persona_1_name} ({g.domain ?? 'email'})</option>
						{/each}
					</select>
				</div>

				<div class="flex flex-col gap-1.5">
					<label class="text-xs text-white/70 font-medium" for="view-select">View format</label>
					<select id="view-select" class="field" bind:value={selectedView} disabled={selectedId === null}>
						{#each viewOptions as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if selectedGen}
				<div class="flex flex-wrap gap-3 text-xs text-white/40">
					<span class="badge-blue">{domain}</span>
					<span>{selectedGen.thread_count} thread{selectedGen.thread_count === 1 ? '' : 's'}</span>
					<span>{selectedGen.message_count} message{selectedGen.message_count === 1 ? '' : 's'}</span>
					<span class="truncate">{selectedGen.relationship}</span>
				</div>
			{/if}

			<div class="flex justify-end">
				<button class="btn btn-primary btn-sm rounded-xl" on:click={handleFetch}
					disabled={selectedId === null || fetching}>
					{fetching ? 'Fetching...' : 'Fetch JSON'}
				</button>
			</div>
		{/if}
	</div>

	<!-- Error -->
	{#if fetchError}
		<div class="alert-error">{fetchError}</div>
	{/if}

	<!-- Loading -->
	{#if fetching}
		<div class="flex items-center gap-2.5 text-sm text-white/60 py-8 justify-center">
			<span class="loading loading-spinner loading-sm" style="color:#00f9cf;"></span>
			Fetching...
		</div>
	{/if}

	<!-- JSON output -->
	{#if rawJson && !fetching}
		<div class="surface p-5 flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<div class="section-label section-label--purple">Response JSON</div>
				<button class="btn-glass text-xs py-1.5 px-3" on:click={copyToClipboard}>
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>
			<pre class="surface-inset p-4 text-xs text-white/80 overflow-auto max-h-[600px] leading-relaxed"
				style="white-space:pre-wrap; word-break:break-word; font-family:monospace;"
			>{rawJson}</pre>
		</div>
	{/if}
</div>
