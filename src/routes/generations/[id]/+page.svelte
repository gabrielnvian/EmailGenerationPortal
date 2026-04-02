<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from "$app/paths";
	import {page} from "$app/stores";
	import {onMount} from "svelte";
	import {getGeneration, deleteGeneration, type GenerationDetail} from "../generations";
	import type {GenerateData} from "../../generate/generate";
	import TimelineView from "../../TimelineView.svelte";

	let detail: GenerationDetail | null = null;
	let loading = true;
	let error = '';
	let deleting = false;

	$: id = Number($page.params.id);

	onMount(async () => {
		const result = await getGeneration(id);
		if (result.success) {
			detail = result.data;
		} else {
			error = result.error;
		}
		loading = false;
	});

	async function handleDelete() {
		if (!confirm('Delete this generation? This cannot be undone.')) return;
		deleting = true;
		const result = await deleteGeneration(id);
		if (result.success) {
			goto(`${base}/generations/`);
		} else {
			error = result.error;
			deleting = false;
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
			return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'});
		} catch {
			return dateStr;
		}
	}

	$: timelineData = detail?.response ? {
		...detail.response,
		format: detail.response.format ?? (detail as Record<string, unknown>).format ?? 'gmail'
	} as GenerateData : undefined;
</script>

<div class="flex flex-col gap-8">
	<!-- Header -->
	<div class="flex flex-col gap-2 pt-4">
		<button class="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors w-fit" on:click={() => goto(`${base}/generations/`)}>
			← Back to generations
		</button>
		<div class="flex items-center gap-3">
			<h1 class="text-4xl font-black tracking-tight">Generation #{id}</h1>
			{#if detail}
				<span class="badge-blue">{detail.format ?? 'gmail'}</span>
			{/if}
		</div>
		<div class="divider-glow"></div>
	</div>

	{#if loading}
		<div class="flex items-center gap-2.5 text-sm text-white/60 py-12 justify-center">
			<span class="loading loading-spinner loading-sm" style="color:#00f9cf;"></span>
			Loading...
		</div>
	{:else if error}
		<div class="alert-error">{error}</div>
	{:else if detail}
		<!-- Request info -->
		<div class="surface p-5 flex flex-col gap-4">
			<div class="section-label section-label--cyan">Request</div>

			<!-- Personas -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div class="surface-inset p-4 flex flex-col gap-1">
					<span class="badge-cyan text-[10px] font-bold mb-1">INBOX OWNER</span>
					<span class="text-sm font-semibold text-white">{detail.persona_0_name}</span>
					<span class="text-xs text-white/50">{detail.persona_0_email}</span>
				</div>
				<div class="surface-inset p-4 flex flex-col gap-1">
					<span class="badge-purple text-[10px] font-bold mb-1">CONTACT</span>
					<span class="text-sm font-semibold text-white">{detail.persona_1_name}</span>
					<span class="text-xs text-white/50">{detail.persona_1_email}</span>
				</div>
			</div>

			<!-- Details -->
			<div class="flex flex-col gap-2">
				<div class="text-sm">
					<span class="text-white/50">Relationship:</span>
					<span class="text-white/80 ml-1">{detail.relationship}</span>
				</div>
				{#if detail.arc}
					<div class="text-sm">
						<span class="text-white/50">Arc:</span>
						<span class="text-white/80 ml-1">{detail.arc}</span>
					</div>
				{/if}
			</div>

			<!-- Stats -->
			<div class="flex flex-wrap gap-4 text-xs text-white/40">
				<span>{detail.thread_count} thread{detail.thread_count === 1 ? '' : 's'}</span>
				<span>{detail.message_count} message{detail.message_count === 1 ? '' : 's'}</span>
				<span>{detail.timespan_days} days</span>
				<span>Generated in {formatDuration(detail.duration_ms)}</span>
				<span>{formatDate(detail.created_at)}</span>
			</div>
		</div>

		<!-- Timeline -->
		{#if timelineData}
			<TimelineView data={timelineData}/>
		{/if}

		<!-- Actions -->
		<div class="flex justify-end">
			<button
				class="btn-glass text-xs py-1.5 px-3"
				style="color:rgba(255,100,100,0.7); border-color:rgba(255,80,80,0.15);"
				disabled={deleting}
				on:click={handleDelete}
			>
				{deleting ? 'Deleting...' : 'Delete generation'}
			</button>
		</div>
	{/if}
</div>
