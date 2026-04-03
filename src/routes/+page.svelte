<script lang="ts">
	import {personas} from '../personas';
	import type {Persona} from '../personas.model';
	import PersonaCard from './PersonaCard.svelte';
	import PersonaFormModal from './PersonaFormModal.svelte';
	import {goto} from '$app/navigation';

	let idx: number = 0;
	let showModal = false;
	let successMessage = '';
	let modalRef: PersonaFormModal;

	$: selected = $personas[idx] ?? null;

	$: if (idx > $personas.length - 1) {
		idx = Math.max(0, $personas.length - 1);
	}

	$: fieldCounts = $personas.reduce((acc, p) => {
		acc[p.field] = (acc[p.field] ?? 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	$: fields = Object.entries(fieldCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4);

	function openCreateModal() {
		modalRef.populateForCreate();
		showModal = true;
	}

	function openEditModal(persona: Persona) {
		modalRef.populateForEdit(persona);
		showModal = true;
	}

	function handleModalClose() {
		showModal = false;
	}

	function handleSaved(event: CustomEvent<{ message: string }>) {
		showModal = false;
		successMessage = event.detail.message;
	}
</script>

<div class="flex flex-col gap-8">
	<!-- Hero -->
	<div class="flex flex-col gap-3 pt-6">
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full" style="background:#00f9cf; box-shadow: 0 0 10px #00f9cf88;"></div>
			<span class="text-[11px] text-white/40 font-semibold tracking-widest uppercase">Structured Data Generator</span>
		</div>
		<h1 class="text-5xl font-black tracking-tight leading-[1.05]">
			Generate<br/>
			<span class="text-gradient">realistic data.</span>
		</h1>
		<p class="text-white/50 text-sm max-w-sm leading-relaxed">
			Build relationship timelines between personas — emails, calendar events, and more — powered by AI.
		</p>
	</div>

	{#if successMessage}
		<div class="alert-success" role="alert">{successMessage}</div>
	{/if}

	<!-- Nav cards -->
	<div class="grid grid-cols-3 gap-3">
		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto('list')}>
			<div class="w-9 h-9 rounded-xl flex items-center justify-center text-base"
				 style="background:#29b0ff14; color:#29b0ff;">
				👥
			</div>
			<div>
				<p class="font-semibold text-white text-sm">Browse Personas</p>
				<p class="text-xs text-white/45 mt-0.5">{$personas.length} contacts loaded</p>
			</div>
			<span class="text-white/25 text-xs mt-auto">View all →</span>
		</button>

		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto('generate')}>
			<div class="w-9 h-9 rounded-xl flex items-center justify-center text-base"
				 style="background:#00f9cf14; color:#00f9cf;">
				✉️
			</div>
			<div>
				<p class="font-semibold text-white text-sm">Generate</p>
				<p class="text-xs text-white/45 mt-0.5">Emails, calendar events, and more</p>
			</div>
			<span class="text-white/25 text-xs mt-auto">Get started →</span>
		</button>

		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto('generations')}>
			<div class="w-9 h-9 rounded-xl flex items-center justify-center text-base"
				 style="background:#8c45ff14; color:#8c45ff;">
				📋
			</div>
			<div>
				<p class="font-semibold text-white text-sm">Past Generations</p>
				<p class="text-xs text-white/45 mt-0.5">Search and browse results</p>
			</div>
			<span class="text-white/25 text-xs mt-auto">Browse →</span>
		</button>
	</div>

	<!-- Top fields -->
	{#if fields.length > 0}
		<div class="flex flex-col gap-3">
			<p class="text-[11px] text-white/40 font-semibold tracking-widest uppercase">Top fields</p>
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
				{#each fields as [field, count] (field)}
					<div class="surface p-3.5 flex flex-col gap-1">
						<span class="text-xl font-bold text-white">{count}</span>
						<span class="text-xs text-white/50 truncate">{field}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex items-center justify-end gap-3">
		<a class="btn-glass" href="/EmailGenerationPortal/viewer/">
			API Viewer
		</a>
		<a class="btn-glass" href="/EmailGenerationPortal/test-report/">
			See test coverage
		</a>
		<button class="btn-glass" on:click={openCreateModal}>
			+ Add Persona
		</button>
	</div>

	<div class="divider-glow"></div>

	<!-- Persona preview -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<p class="text-sm font-medium text-white/60">Preview a persona</p>
			<select bind:value={idx} class="field" style="width:auto; max-width:280px;">
				{#each $personas as persona, i (persona.id)}
					<option value={i}>{persona.name} — {persona.company}</option>
				{/each}
			</select>
		</div>

		{#if selected}
			<div class="flex flex-col gap-2">
				<PersonaCard persona={selected}/>
				<div class="flex justify-end">
					<button class="btn-glass text-xs py-1.5 px-3" on:click={() => openEditModal(selected)}>
						Edit
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<PersonaFormModal
	bind:this={modalRef}
	visible={showModal}
	on:close={handleModalClose}
	on:saved={handleSaved}
/>
