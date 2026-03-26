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

<div class="flex flex-col gap-10">
	<div class="flex flex-col gap-3 pt-4">
		<div class="flex items-center gap-2 mb-1">
			<div class="w-2 h-2 rounded-full" style="background:#00f9cf; box-shadow: 0 0 8px #00f9cf;"></div>
			<span class="text-xs text-white/30 font-medium tracking-wide">Email Generation Portal</span>
		</div>
		<h1 class="text-5xl font-black tracking-tight leading-none">
			Generate<br/>
			<span style="background: linear-gradient(100deg, #00f9cf, #29b0ff 50%, #8c45ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
				targeted emails.
			</span>
		</h1>
		<p class="text-white/35 text-sm max-w-sm leading-relaxed">
			Build persona-to-persona email campaigns using AI-generated content tuned to each contact's profile.
		</p>
	</div>

	{#if successMessage}
		<div
			class="rounded-2xl border px-4 py-3 text-sm"
			style="background:rgba(0, 249, 207, 0.08); border-color:rgba(0, 249, 207, 0.22); color:#d9fffb;"
			role="alert"
		>
			{successMessage}
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-3">
		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto('list')}>
			<div class="w-9 h-9 rounded-xl flex items-center justify-center text-base"
				 style="background:#29b0ff15; color:#29b0ff;">
				👥
			</div>
			<div>
				<p class="font-semibold text-white text-sm">Browse Personas</p>
				<p class="text-xs text-white/35 mt-0.5">{$personas.length} contacts loaded</p>
			</div>
			<span class="text-white/20 text-xs mt-auto">View all →</span>
		</button>

		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto('generate')}>
			<div class="w-9 h-9 rounded-xl flex items-center justify-center text-base"
				 style="background:#00f9cf15; color:#00f9cf;">
				✉️
			</div>
			<div>
				<p class="font-semibold text-white text-sm">Generate Emails</p>
				<p class="text-xs text-white/35 mt-0.5">Queue AI-generated campaigns</p>
			</div>
			<span class="text-white/20 text-xs mt-auto">Get started →</span>
		</button>
	</div>

	{#if fields.length > 0}
		<div class="flex flex-col gap-3">
			<p class="text-xs text-white/30 font-medium">Top fields</p>
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
				{#each fields as [field, count] (field)}
					<div class="surface p-3 flex flex-col gap-1">
						<span class="text-xl font-bold text-white">{count}</span>
						<span class="text-xs text-white/40 truncate">{field}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="flex items-center justify-end">
		<a
			class="px-4 py-2 rounded-2xl text-sm font-semibold border transition-all hover:-translate-y-[1px]"
			href="/EmailGenerationPortal/test-report/"
			style="background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); backdrop-filter:blur(14px); color:#f8fbff; box-shadow:0 10px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06);"
		>
			See test coverage
		</a>

		<button
			class="px-4 py-2 rounded-2xl text-sm font-semibold border transition-all hover:-translate-y-[1px]"
			on:click={openCreateModal}
			style="background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); backdrop-filter:blur(14px); color:#f8fbff; box-shadow:0 10px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06);"
		>
			+ Add Persona
		</button>
	</div>

	<div class="divider-glow"></div>

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
			<div class="flex flex-col gap-1.5">
				<PersonaCard persona={selected}/>
				<div class="flex justify-end">
					<button
						class="px-3 py-1.5 rounded-xl text-xs font-medium border text-white/50 hover:text-white transition"
						style="border-color:rgba(255,255,255,0.10); background:rgba(255,255,255,0.05);"
						on:click={() => openEditModal(selected)}
					>
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
