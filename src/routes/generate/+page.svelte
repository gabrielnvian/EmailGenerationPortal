<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';
	import {personas} from "../../personas";
	import {queueEmails} from "./generate";
	import type {Persona} from "../../personas.model";
	import PersonaSelector from "../../PersonaSelector.svelte";
	import {writable, type Writable} from "svelte/store";

	let field: string = "";
	let idea: string = "";
	let n: number = 10;

	let selectedPersonas: Writable<Persona[]> = writable([]);

	$: filteredPersonas = $personas.filter(persona => persona.field === field);

	// Using Sets to clear out duplicate values
	$: fields = new Set($personas.map(persona => persona.field));
</script>

<button on:click={() => goto(`${base}/`)}>Home</button>
<br/>
<br/>

<label>Field</label>
<select bind:value={field} on:change={() => $selectedPersonas = []}>
	{#each fields as field}
		<option value={field}>
			{field}
		</option>
	{/each}
</select>

<br/>
<br/>

{#if field}
	<PersonaSelector personas={filteredPersonas} bind:selectedPersonas/>
{:else}
	<p style="color:red">Select a field to view personas</p>
{/if}

<br/>
<br/>

<label>Initial prompt (idea)</label>
<textarea bind:value={idea}/>

<br/>
<br/>

<label>Number of emails to be generated</label>
<input bind:value={n} type="number"/>

<br/>
<br/>
<br/>
<br/>


<br/>
<br/>

<button on:click={() => queueEmails(field, idea, $selectedPersonas, n)}>
	Queue up emails
</button>
