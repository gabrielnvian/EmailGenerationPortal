<script lang="ts">
	import type {Persona} from "../personas.model";

	export let persona: Persona;
	export let noSup: boolean = false;
	export let isSup: boolean = false;

	$: showSup = persona.supervisor && !noSup;
</script>

<div style="padding: 5px; border: {isSup ? '' : '1px dashed gray'}">
	<strong>Name: {persona.name}</strong><br/>
	<span>Title: {persona.jobTitle}</span><br/>
	<span>Company: {persona.company}</span><br/>
	<span>Field: {persona.field}</span><br/>
	<span>Phone: {persona.phone}</span><br/>
	<span>Email: {persona.email}</span><br/>

	{#if showSup}
		<span>Supervisor:</span>
		<ul style="margin: 0">
			<svelte:self isSup persona={persona.supervisor}/>
		</ul>
	{/if}
</div>
