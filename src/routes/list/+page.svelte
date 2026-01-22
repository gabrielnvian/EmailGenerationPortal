<script lang="ts">
	import {personas} from "../../personas";
	import Persona from "../Persona.svelte";
</script>

{#each personas as persona}
	<Persona {persona}/>

	<br/>
	<br/>
{/each}
