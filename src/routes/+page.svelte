<script lang="ts">
	import {personas} from "../personas";
	import Persona from "./Persona.svelte";
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';

	let idx: number = 0;

	$: selected = $personas[idx];
</script>

<button on:click={() => goto(`${base}/list`)}>List</button>
<br/>
<button on:click={() => goto(`${base}/generate`)}>Generate</button>
<br/>
<br/>

<select autofocus bind:value={idx} id="cars" name="cars">
	{#each $personas as persona, idx}
		<option value={idx}>
			{persona.name} at {persona.company}
		</option>
	{/each}
</select>

<br/>
<br/>
<br/>

{#if selected}
	<Persona persona={selected}/>
{/if}
