<script lang="ts">
	import {personas} from "../personas";
</script>

{#each personas as persona}
	<strong>{JSON.stringify(persona)}</strong>
	{#each Object.keys(persona) as key}
		<p>{key}: {persona[key]}</p>
	{/each}
{/each}
