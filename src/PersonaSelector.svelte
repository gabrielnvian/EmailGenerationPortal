<script lang="ts">
	import type {Persona} from "./personas.model";
	import PersonaCard from "./routes/PersonaCard.svelte";
	import type {Writable} from "svelte/store";

	export let personas: Persona[] = [];
	export let selectedPersonas: Writable<Persona[]>;

	let personaIdx: number = 0;

	function addPersona() {
		const personaToBeAdded = personas[personaIdx];

		if ($selectedPersonas.map(persona => persona.name).includes(personaToBeAdded.name)) return;

		$selectedPersonas = [...$selectedPersonas, personaToBeAdded];
	}
</script>

<select bind:value={personaIdx}>
	{#each personas as persona, idx}
		<option value={idx}>
			{persona.name} at {persona.company}
		</option>
	{/each}
</select>

<button on:click={addPersona}>Add</button>

<br/>

{#each $selectedPersonas as persona}
	<PersonaCard noSup {persona}/>

	<br/>
{/each}
