<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';
	import {personas} from "../../personas";
	import {generateEmails, personaToGeneratePersona, fetchFormats, type GenerateData, type GenerateResult, type OutputFormat} from "./generate";
	import {onMount} from "svelte";
	import type {Persona} from "../../personas.model";
	import TimelineView from "../TimelineView.svelte";

	// --- Persona selection + per-persona extras ---
	let personaIdxLeft: number = -1;
	let personaIdxRight: number = -1;
	let tones: Record<number, string> = {};
	let personalDetails: Record<number, string> = {};

	$: personaLeft = personaIdxLeft >= 0 ? $personas[personaIdxLeft] ?? null : null;
	$: personaRight = personaIdxRight >= 0 ? $personas[personaIdxRight] ?? null : null;
	$: selectedPersonas = [personaLeft, personaRight].filter((p): p is Persona => p !== null);

	// --- Format ---
	let availableFormats: OutputFormat[] = ['gmail'];
	let selectedFormat: OutputFormat = 'gmail';
	onMount(async () => {
		availableFormats = await fetchFormats();
	});

	// --- Generation fields ---
	let relationship: string = "";
	let arc: string = "";
	let threadCount: number = 3;
	let timespanValue: number = 3;
	let timespanUnit: string = "months";

	$: timespan = Number.isFinite(timespanValue) && timespanValue >= 1 ? `${timespanValue} ${timespanUnit}` : '';
	$: canGenerate = selectedPersonas.length === 2 && relationship.trim().length > 0 && Number.isFinite(threadCount) && threadCount >= 1 && threadCount <= 20 && Number.isFinite(timespanValue) && timespanValue >= 1;

	// --- Status ---
	type Status = { type: 'idle' } | { type: 'loading' } | { type: 'success'; data: GenerateData; id?: number } | { type: 'error'; message: string };
	let status: Status = { type: 'idle' };

	async function handleGenerate() {
		status = { type: 'loading' };

		const personaObjects = selectedPersonas.map(p => {
			const details = personalDetails[p.id]?.trim();
			return personaToGeneratePersona(
				p,
				tones[p.id]?.trim() || undefined,
				details ? details.split(',').map(d => d.trim()).filter(Boolean) : undefined
			);
		});

		const result: GenerateResult = await generateEmails({
			personas: personaObjects,
			relationship,
			arc: arc.trim() || undefined,
			threadCount,
			timespan: timespan.trim() || undefined,
			format: selectedFormat,
		});

		if (result.success) {
			const d = result.data;
			// Fill in defaults for missing summary fields
			const timeline = d?.timeline ?? [];
			const totalMessages = timeline.reduce((n, t) => n + (t.messages?.length ?? 0), 0);
			const summary = {
				totalMessages: d?.summary?.totalMessages ?? totalMessages,
				timespanDays: d?.summary?.timespanDays ?? 0,
				sentimentProgression: d?.summary?.sentimentProgression ?? [],
				arcDescription: d?.summary?.arcDescription ?? '',
			};
			status = { type: 'success', data: { format: d?.format ?? selectedFormat, timeline, summary }, id: result.id };
		} else {
			status = { type: 'error', message: result.error };
		}
	}

</script>

<div class="flex flex-col gap-8">
	<!-- Header -->
	<div class="flex flex-col gap-2 pt-4">
		<button class="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors w-fit" on:click={() => goto(`${base}/`)}>
			← Back
		</button>
		<h1 class="text-4xl font-black tracking-tight">Generate emails</h1>
		<p class="text-white/60 text-sm">Build a relationship timeline between two personas.</p>
		<div class="divider-glow"></div>
	</div>

	<!-- Personas -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
		<!-- Left: Inbox Owner -->
		<div class="surface p-5 flex flex-col gap-4">
			<div class="section-label section-label--cyan">Inbox Owner</div>
			<select class="field" bind:value={personaIdxLeft}>
				<option value={-1} disabled>Select persona...</option>
				{#each $personas as persona, idx (persona.id)}
					{#if idx !== personaIdxRight}
						<option value={idx}>{persona.name} — {persona.company}</option>
					{/if}
				{/each}
			</select>
			{#if personaLeft}
				<div class="surface-inset p-3 flex flex-col gap-1 text-xs">
					<span class="text-white/70">{personaLeft.jobTitle} @ {personaLeft.company}</span>
					<span class="text-white/45">{personaLeft.email}</span>
					{#if personaLeft.personality}<span class="text-white/35 truncate" title={personaLeft.personality}>{personaLeft.personality}</span>{/if}
					{#if personaLeft.signature}<span class="text-white/25 truncate font-mono">sig: {personaLeft.signature.split('\n')[0]}...</span>{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-xs text-white/60" for="tone-left">Tone <span class="text-white/30">optional</span></label>
					<input id="tone-left" class="field text-sm" placeholder="e.g. casual, direct" bind:value={tones[personaLeft.id]}/>
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-xs text-white/60" for="details-left">Personal details <span class="text-white/30">optional</span></label>
					<input id="details-left" class="field text-sm" placeholder="comma-separated" bind:value={personalDetails[personaLeft.id]}/>
				</div>
			{/if}
		</div>

		<!-- Right: Contact -->
		<div class="surface p-5 flex flex-col gap-4">
			<div class="section-label section-label--purple">Contact</div>
			<select class="field" bind:value={personaIdxRight}>
				<option value={-1} disabled>Select persona...</option>
				{#each $personas as persona, idx (persona.id)}
					{#if idx !== personaIdxLeft}
						<option value={idx}>{persona.name} — {persona.company}</option>
					{/if}
				{/each}
			</select>
			{#if personaRight}
				<div class="surface-inset p-3 flex flex-col gap-1 text-xs">
					<span class="text-white/70">{personaRight.jobTitle} @ {personaRight.company}</span>
					<span class="text-white/45">{personaRight.email}</span>
					{#if personaRight.personality}<span class="text-white/35 truncate" title={personaRight.personality}>{personaRight.personality}</span>{/if}
					{#if personaRight.signature}<span class="text-white/25 truncate font-mono">sig: {personaRight.signature.split('\n')[0]}...</span>{/if}
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-xs text-white/60" for="tone-right">Tone <span class="text-white/30">optional</span></label>
					<input id="tone-right" class="field text-sm" placeholder="e.g. professional but warm" bind:value={tones[personaRight.id]}/>
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-xs text-white/60" for="details-right">Personal details <span class="text-white/30">optional</span></label>
					<input id="details-right" class="field text-sm" placeholder="comma-separated" bind:value={personalDetails[personaRight.id]}/>
				</div>
			{/if}
		</div>
	</div>

	<!-- Relationship + Config -->
	<div class="surface p-5 flex flex-col gap-5">
		<div class="flex flex-col gap-1.5">
			<label class="text-xs text-white/70 font-medium" for="relationship-input">Relationship</label>
			<textarea
				id="relationship-input"
				class="field h-20 resize-none"
				placeholder="Describe how these people relate, e.g. 'new client, first HVAC project together'"
				bind:value={relationship}
			></textarea>
		</div>

		<div class="flex flex-col gap-1.5">
			<label class="text-xs text-white/70 font-medium" for="arc-input">
				Narrative arc <span class="text-white/30 font-normal">optional</span>
			</label>
			<textarea
				id="arc-input"
				class="field h-16 resize-none"
				placeholder="e.g. 'starts professional, builds rapport, hits a billing snag, resolves amicably'"
				bind:value={arc}
			></textarea>
		</div>

		<div class="grid grid-cols-3 gap-4">
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/70 font-medium" for="format-select">Format</label>
				<select id="format-select" class="field" bind:value={selectedFormat}>
					{#each availableFormats as fmt}
						<option value={fmt}>{fmt === 'gmail' ? 'Gmail' : fmt === 'outlook' ? 'Outlook' : fmt === 'gcal' ? 'Google Calendar' : fmt}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/70 font-medium" for="thread-count-input">{selectedFormat === 'gcal' ? 'Event count' : 'Thread count'}</label>
				<input id="thread-count-input" class="field" bind:value={threadCount} type="number" min="1" max="20"/>
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/70 font-medium" for="timespan-value">Timespan</label>
				<div class="flex gap-2">
					<input id="timespan-value" class="field" style="width:5rem; flex:none;" bind:value={timespanValue} type="number" min="1"/>
					<select class="field flex-1" bind:value={timespanUnit}>
						<option value="days">days</option>
						<option value="weeks">weeks</option>
						<option value="months">months</option>
						<option value="years">years</option>
					</select>
				</div>
			</div>
		</div>

		<div class="divider-glow"></div>

		<!-- Status -->
		{#if status.type === 'loading'}
			<div class="flex items-center gap-2.5 text-sm text-white/60">
				<span class="loading loading-spinner loading-sm" style="color:#00f9cf;"></span>
				Generating timeline...
			</div>
		{:else if status.type === 'success'}
			<div class="alert-success">
				Generated {status.data.summary.totalMessages} {status.data.format === 'gcal' ? 'event' : 'message'}{status.data.summary.totalMessages === 1 ? '' : 's'} across {status.data.timeline.length} {status.data.format === 'gcal' ? 'event' : 'thread'}{status.data.timeline.length === 1 ? '' : 's'}
			</div>
		{:else if status.type === 'error'}
			<div class="alert-error">{status.message}</div>
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			<button
				class="btn btn-primary btn-sm rounded-xl"
				disabled={!canGenerate || status.type === 'loading'}
				on:click={handleGenerate}>
				Generate
			</button>
			{#if !canGenerate}
				<p class="text-xs text-white/40">Select 2 personas and describe their relationship.</p>
			{/if}
		</div>
	</div>

	<!-- Results -->
	{#if status.type === 'success'}
		{#if status.id}
			<div class="flex items-center gap-3">
				<span class="text-xs text-white/40">Generation #{status.id}</span>
				<a href="{base}/generations/{status.id}/" class="text-xs font-medium" style="color:#00f9cf;">View full page →</a>
			</div>
		{/if}
		<TimelineView data={status.data}/>
	{/if}
</div>
