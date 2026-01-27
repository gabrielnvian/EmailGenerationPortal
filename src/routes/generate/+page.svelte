<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';
	import {personas} from "../../personas";
	import {queueEmails} from "./generate";
	import type {Persona} from "../../personas.model";
	import PersonaSelector from "../../PersonaSelector.svelte";
	import {writable, type Writable} from "svelte/store";

	let fromField: string = "";
	let toField: string = "";
	let idea: string = "";
	let n: number = 10;

	let fromPersonas: Writable<Persona[]> = writable([]);
	let toPersonas: Writable<Persona[]> = writable([]);

	$: filteredFromPersonas = $personas.filter(p => p.field === fromField);
	$: filteredToPersonas   = $personas.filter(p => p.field === toField);


	// Using Sets to clear out duplicate values
	$: fields = Array.from(new Set($personas.map(p => p.field))).sort();
</script>

<button on:click={() => goto(`${base}/`)}>Home</button>
<br/>
<br/>

<h2>FROM</h2>
<label>Field</label>
<select bind:value={fromField} on:change={() => $fromPersonas = []}>
	{#each fields as field}
		<option value={field}>
			{field}
		</option>
	{/each}
</select>

<br/>
<br/>

{#if fromField}
	<PersonaSelector personas={filteredFromPersonas} selectedPersonas="{fromPersonas}" />
{:else}
	<p style="color:red">Select a field to view personas</p>
{/if}

<p>--------------------------------------</p>

<h2>TO</h2>
<label>Field</label>
<select bind:value={toField} on:change={() => $toPersonas = []}>
	{#each fields as field}
		<option value={field}>
			{field}
		</option>
	{/each}
</select>
<br/>
<br/>

{#if toField}
	<PersonaSelector personas={filteredToPersonas} selectedPersonas="{toPersonas}"/>
{:else}
	<p style="color:red">Select a field to view personas</p>
{/if}

<br/>
<br/>
<p>--------------------------------------</p>

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

<button on:click={() => queueEmails(fromField, toField, idea, $fromPersonas, $toPersonas, n)}>
	Queue up emails
</button>
