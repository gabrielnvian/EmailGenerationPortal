<script lang="ts">
	import {personas} from "../../personas";
	import Persona from "../Persona.svelte";
	import {goto} from "$app/navigation";
	import {base} from "$app/paths";
</script>

<button on:click={() => goto(`${base}/`)}>Home</button>
<br/>
<br/>

{#each $personas as persona}
	<Persona {persona}/>

	<br/>
	<br/>
{/each}
