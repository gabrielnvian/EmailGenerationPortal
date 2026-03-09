<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';
	import {personas} from "../../personas";
	import {coldStart, queueEmails, type ActionResult} from "./generate";
	import type {Persona} from "../../personas.model";
	import PersonaSelector from "../../PersonaSelector.svelte";
	import {writable, type Writable} from "svelte/store";

	let fromField: string = "";
	let toField: string = "";
	let idea: string = "";
	let n: number = 10;
	let length: number = 100;

	let fromPersonas: Writable<Persona[]> = writable([]);
	let toPersonas: Writable<Persona[]> = writable([]);

	$: filteredFromPersonas = $personas.filter(p => p.field === fromField);
	$: filteredToPersonas = $personas.filter(p => p.field === toField);
	$: fields = Array.from(new Set($personas.map(p => p.field))).sort();
	$: canQueue = $fromPersonas.length > 0 && $toPersonas.length > 0 && idea.trim().length > 0;

	type Status = { type: 'idle' } | { type: 'loading'; label: string } | { type: 'success'; label: string } | { type: 'error'; message: string };
	let status: Status = { type: 'idle' };

	async function handleColdStart() {
		status = { type: 'loading', label: 'Starting...' };
		const result: ActionResult = await coldStart();
		status = result.success ? { type: 'success', label: 'Cold start complete' } : { type: 'error', message: result.error };
	}

	async function handleQueue(version: number) {
		status = { type: 'loading', label: 'Queuing emails...' };
		const result: ActionResult = await queueEmails(fromField, toField, idea, $fromPersonas, $toPersonas, n, length, version);
		status = result.success ? { type: 'success', label: 'Emails queued successfully' } : { type: 'error', message: result.error };
	}
</script>

<div class="flex flex-col gap-8">
	<!-- Header -->
	<div class="flex flex-col gap-2 pt-4">
		<button class="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors w-fit mb-2" on:click={() => goto(`${base}/`)}>
			← Back
		</button>
		<h1 class="text-4xl font-black tracking-tight">
			Generate emails
		</h1>
		<p class="text-white/35 text-sm">Configure your campaign and queue it for generation.</p>
		<div class="divider-glow mt-1"></div>
	</div>

	<!-- FROM / TO -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- FROM -->
		<div class="surface p-5 flex flex-col gap-4">
			<div class="flex items-center gap-2">
				<div class="w-1.5 h-1.5 rounded-full" style="background:#00f9cf;"></div>
				<span class="text-xs font-semibold text-white/60">From</span>
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/30" for="from-field">Field</label>
				<select id="from-field" class="field" bind:value={fromField} on:change={() => $fromPersonas = []}>
					<option value="" disabled>Select a field...</option>
					{#each fields as field}
						<option value={field}>{field}</option>
					{/each}
				</select>
			</div>
			{#if fromField}
				<PersonaSelector personas={filteredFromPersonas} selectedPersonas={fromPersonas}/>
			{:else}
				<p class="text-xs text-white/20 italic">Select a field to browse personas</p>
			{/if}
		</div>

		<!-- TO -->
		<div class="surface p-5 flex flex-col gap-4">
			<div class="flex items-center gap-2">
				<div class="w-1.5 h-1.5 rounded-full" style="background:#8c45ff;"></div>
				<span class="text-xs font-semibold text-white/60">To</span>
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/30" for="to-field">Field</label>
				<select id="to-field" class="field" bind:value={toField} on:change={() => $toPersonas = []}>
					<option value="" disabled>Select a field...</option>
					{#each fields as field}
						<option value={field}>{field}</option>
					{/each}
				</select>
			</div>
			{#if toField}
				<PersonaSelector personas={filteredToPersonas} selectedPersonas={toPersonas}/>
			{:else}
				<p class="text-xs text-white/20 italic">Select a field to browse personas</p>
			{/if}
		</div>
	</div>

	<!-- Config + Actions -->
	<div class="surface p-5 flex flex-col gap-6">
		<div class="flex flex-col gap-1.5">
			<label class="text-xs text-white/30" for="idea-input">Idea / prompt</label>
			<textarea
				id="idea-input"
				class="field h-24 resize-none"
				placeholder="Describe the email idea..."
				bind:value={idea}
			></textarea>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/30" for="n-input">Number of emails</label>
				<input id="n-input" class="field" bind:value={n} type="number" min="1"/>
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs text-white/30" for="length-input">Characters per email</label>
				<input id="length-input" class="field" bind:value={length} type="number" min="1"/>
			</div>
		</div>

		<div class="divider-glow"></div>

		<!-- Status -->
		{#if status.type === 'loading'}
			<div class="flex items-center gap-2 text-sm text-white/40">
				<span class="loading loading-spinner loading-xs"></span>
				{status.label}
			</div>
		{:else if status.type === 'success'}
			<div class="text-sm rounded-xl px-4 py-2.5 font-medium" style="background:#00f9cf12; color:#00f9cf; border:1px solid #00f9cf22;">
				✓ {status.label}
			</div>
		{:else if status.type === 'error'}
			<div class="text-sm rounded-xl px-4 py-2.5" style="background:#ff4a4a12; color:#ff8080; border:1px solid #ff4a4a22;">
				✕ {status.message}
			</div>
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			<button
				class="btn btn-primary btn-sm rounded-xl"
				disabled={!canQueue || status.type === 'loading'}
				on:click={() => handleQueue(1)}>
				Queue — Old Workflow
			</button>
			<button
				class="btn btn-secondary btn-sm rounded-xl"
				disabled={!canQueue || status.type === 'loading'}
				on:click={() => handleQueue(2)}>
				Queue — 2-Agent Workflow
			</button>
			<button
				class="btn btn-ghost btn-sm rounded-xl text-white/30 hover:text-white/60 ml-auto"
				disabled={status.type === 'loading'}
				on:click={handleColdStart}>
				Cold Start
			</button>
		</div>

		{#if !canQueue}
			<p class="text-xs text-white/20">Add at least one From persona, one To persona, and an idea to queue.</p>
		{/if}
	</div>
</div>
