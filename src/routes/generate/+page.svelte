<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';
	import {personas} from "../../personas";
	import {generateEmails, personaToGeneratePersona, type GenerateData, type GenerateResult} from "./generate";
	import type {Persona} from "../../personas.model";
	import TimelineView from "../TimelineView.svelte";

	// --- Persona selection + per-persona extras ---
	let selectedPersonas: Persona[] = [];
	let tones: Record<number, string> = {};
	let personalDetails: Record<number, string> = {};
	let personaIdx: number = 0;

	function addPersona() {
		const p = $personas[personaIdx];
		if (!p || selectedPersonas.length >= 2 || selectedPersonas.some(s => s.id === p.id)) return;
		selectedPersonas = [...selectedPersonas, p];
	}

	function removePersona(id: number) {
		selectedPersonas = selectedPersonas.filter(p => p.id !== id);
		delete tones[id];
		delete personalDetails[id];
		tones = tones;
		personalDetails = personalDetails;
	}

	// --- Generation fields ---
	let relationship: string = "";
	let arc: string = "";
	let threadCount: number = 3;
	let timespan: string = "3 months";

	$: canGenerate = selectedPersonas.length === 2 && relationship.trim().length > 0 && Number.isFinite(threadCount) && threadCount >= 1 && threadCount <= 20;

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
			status = { type: 'success', data: { timeline, summary }, id: result.id };
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
	<div class="surface p-5 flex flex-col gap-4">
		<div class="section-label section-label--cyan">
			Personas
			<span class="ml-auto normal-case tracking-normal font-normal text-white/40">exactly 2</span>
		</div>

		<!-- Picker -->
		{#if selectedPersonas.length < 2}
			<div class="flex gap-2 items-center">
				<select class="field flex-1" bind:value={personaIdx}>
					{#each $personas as persona, idx (persona.id)}
						<option value={idx}>{persona.name} — {persona.company}</option>
					{/each}
				</select>
				<button class="btn btn-primary btn-sm rounded-xl flex-shrink-0" on:click={addPersona}>Add</button>
			</div>
		{/if}

		<!-- Selected personas -->
		{#if selectedPersonas.length > 0}
			<div class="flex flex-col gap-3">
				{#each selectedPersonas as persona, pi (persona.id)}
					<div class="surface-inset p-4 flex flex-col gap-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 min-w-0">
								<span class="badge-cyan text-[10px] font-bold">{pi === 0 ? 'INBOX OWNER' : 'CONTACT'}</span>
								<span class="text-sm font-semibold text-white truncate">{persona.name}</span>
								<span class="text-xs text-white/50 truncate hidden sm:inline">{persona.jobTitle} @ {persona.company}</span>
							</div>
							<button
								class="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs flex-shrink-0"
								on:click={() => removePersona(persona.id)}
								aria-label="Remove {persona.name}">
								✕
							</button>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div class="flex flex-col gap-1.5">
								<label class="text-xs text-white/60" for="tone-{persona.id}">
									Tone <span class="text-white/30">optional</span>
								</label>
								<input
									id="tone-{persona.id}"
									class="field text-sm"
									placeholder="e.g. casual, direct"
									bind:value={tones[persona.id]}
								/>
							</div>
							<div class="flex flex-col gap-1.5">
								<label class="text-xs text-white/60" for="details-{persona.id}">
									Personal details <span class="text-white/30">optional</span>
								</label>
								<input
									id="details-{persona.id}"
									class="field text-sm"
									placeholder="comma-separated, e.g. birthday Oct 12, has a dog"
									bind:value={personalDetails[persona.id]}
								/>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
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

		<div class="grid grid-cols-2 gap-4">
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/70 font-medium" for="thread-count-input">Thread count</label>
				<input id="thread-count-input" class="field" bind:value={threadCount} type="number" min="1" max="20"/>
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/70 font-medium" for="timespan-input">
					Timespan <span class="text-white/30 font-normal">optional</span>
				</label>
				<input id="timespan-input" class="field" bind:value={timespan} type="text" placeholder="e.g. 2 months"/>
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
				Generated {status.data.summary.totalMessages} message{status.data.summary.totalMessages === 1 ? '' : 's'} across {status.data.timeline.length} thread{status.data.timeline.length === 1 ? '' : 's'}
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
