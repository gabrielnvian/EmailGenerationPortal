<script lang="ts">
	import {personas} from "../personas";
	import Persona from "./Persona.svelte";

	let idx: number;

	$: selected = personas[idx];
</script>

<a href="/list">List</a>
<br/>
<br/>

<select autofocus bind:value={idx} id="cars" name="cars">
	{#each personas as persona, idx}
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
