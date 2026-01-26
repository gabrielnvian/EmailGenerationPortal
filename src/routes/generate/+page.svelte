<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';
	import {personas} from "../../personas";

	let fieldIdx: number = 0;
	let companyIdx: number = 0;

	$: fields = new Set($personas.map(persona => persona.field));
	$: companies = new Set($personas.map(persona => persona.company));
</script>

<button on:click={() => goto(`${base}/`)}>Home</button>
<br/>
<br/>

<label>Field</label>
<select autofocus bind:value={fieldIdx}>
	{#each fields as field}
		<option value={field}>
			{field}
		</option>
	{/each}
</select>

<br/>
or
<br/>

<label>Company</label>
<select autofocus bind:value={companyIdx}>
	{#each companies as company}
		<option value={company}>
			{company}
		</option>
	{/each}
</select>
