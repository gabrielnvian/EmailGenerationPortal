<script lang="ts">
	import type {Persona} from "./personas.model";
	import PersonaCard from "./routes/PersonaCard.svelte";
	import type {Writable} from "svelte/store";

	export let personas: Persona[] = [];
	export let selectedPersonas: Writable<Persona[]>;

	let personaIdx: number = 0;

	function addPersona() {
		const personaToBeAdded = personas[personaIdx];
		if ($selectedPersonas.some(p => p.id === personaToBeAdded.id)) return;
		$selectedPersonas = [...$selectedPersonas, personaToBeAdded];
	}

	function removePersona(id: number) {
		$selectedPersonas = $selectedPersonas.filter(p => p.id !== id);
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex gap-2 items-center">
		<select class="field flex-1" bind:value={personaIdx}>
			{#each personas as persona, idx (persona.id)}
				<option value={idx}>{persona.name} — {persona.company}</option>
			{/each}
		</select>
		<button
			class="btn btn-primary btn-sm rounded-xl flex-shrink-0"
			on:click={addPersona}>
			Add
		</button>
	</div>

	{#if $selectedPersonas.length > 0}
		<div class="flex flex-col gap-2">
			{#each $selectedPersonas as persona (persona.id)}
				<div class="relative group">
					<PersonaCard noSup {persona}/>
					<button
						class="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 text-xs"
						on:click={() => removePersona(persona.id)}
						aria-label="Remove {persona.name}">
						✕
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
