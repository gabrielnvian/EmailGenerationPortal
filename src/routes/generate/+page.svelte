<script lang="ts">
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';
	import {personas} from "../../personas";
	import {queueEmails} from "./generate";

	let field: string = "";
	let company: string = "";
	let n: number = 10;

	// Using Sets to clear out duplicate values
	$: fields = new Set($personas.map(persona => persona.field));
	$: companies = new Set($personas.map(persona => persona.company));
</script>

<button on:click={() => goto(`${base}/`)}>Home</button>
<br/>
<br/>

<label>Field</label>
<select autofocus bind:value={field}>
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
<select autofocus bind:value={company}>
	{#each companies as company}
		<option value={company}>
			{company}
		</option>
	{/each}
</select>

<br/>

<label>Number of emails to be generated</label>
<input bind:value={n} type="number"/>

<br/>
<br/>
<br/>
<br/>

You selected company {company} / field {field}. {n} emails will be generated


<br/>
<br/>

<button on:click={() => queueEmails(field, company, n)}>
	Queue up emails
</button>
