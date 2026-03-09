<script lang="ts">
	import {personas} from "../../personas";
	import PersonaCard from "../PersonaCard.svelte";
	import {goto} from "$app/navigation";
	import {base} from "$app/paths";

	let search = "";
	$: filtered = search.trim()
		? $personas.filter(p =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			p.company.toLowerCase().includes(search.toLowerCase()) ||
			p.field.toLowerCase().includes(search.toLowerCase()))
		: $personas;
</script>

<div class="flex flex-col gap-8">
	<!-- Header -->
	<div class="flex flex-col gap-2 pt-4">
		<button class="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors w-fit mb-2" on:click={() => goto(`${base}/`)}>
			← Back
		</button>
		<div class="flex items-end gap-3">
			<h1 class="text-4xl font-black tracking-tight">Personas</h1>
			<span class="text-white/25 text-sm mb-1">{filtered.length} of {$personas.length}</span>
		</div>
		<div class="divider-glow mt-1"></div>
	</div>

	<!-- Search -->
	<input
		class="field"
		placeholder="Search by name, company or field..."
		bind:value={search}
	/>

	<!-- Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
		{#each filtered as persona}
			<PersonaCard {persona}/>
		{/each}
	</div>

	{#if filtered.length === 0}
		<p class="text-center text-white/20 text-sm py-12">No personas match your search.</p>
	{/if}
</div>
