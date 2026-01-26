<script lang="ts">
	import type {Persona} from "../personas.model";

	export let persona: Persona;
</script>

<strong>Name: {persona.name}</strong><br/>
<span>Title: {persona.jobTitle}</span><br/>
<span>Company: {persona.company}</span><br/>
<span>Field: {persona.field}</span><br/>
<span>Phone: {persona.phone}</span><br/>
<span>Email: {persona.email}</span><br/>

{#if persona.supervisor}
	<span>Supervisor:</span>
	<ul>
		<svelte:self persona={persona.supervisor}/>
	</ul>
{/if}
