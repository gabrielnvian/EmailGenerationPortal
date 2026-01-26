<script lang="ts">
	import {personas} from "../../personas";
	import PersonaCard from "../PersonaCard.svelte";
	import {goto} from "$app/navigation";
	import {base} from "$app/paths";
</script>

<button on:click={() => goto(`${base}/`)}>Home</button>
<br/>
<br/>

{#each $personas as persona}
	<PersonaCard {persona}/>

	<br/>
	<br/>
{/each}
