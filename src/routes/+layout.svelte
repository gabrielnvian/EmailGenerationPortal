<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { personas } from '../personas';

	let { children } = $props();
	let loaded = $state(false);

	onMount(async () => {
		try {
			await personas.reload();
		} finally {
			loaded = true;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div data-theme="feather" style="min-height:100vh; background:#0c0d14; position:relative; overflow:hidden;">
	<!-- Ambient glow — dual spots for depth -->
	<div style="position:fixed; inset:0; pointer-events:none; z-index:0;">
		<div style="position:absolute; top:-200px; left:50%; transform:translateX(-50%); width:1000px; height:550px; background:radial-gradient(ellipse, #00f9cf0a 0%, transparent 60%);"></div>
		<div style="position:absolute; top:-100px; right:-200px; width:600px; height:400px; background:radial-gradient(ellipse, #8c45ff08 0%, transparent 55%);"></div>
	</div>

	<div style="position:relative; z-index:1;" class="container mx-auto max-w-4xl px-5 py-10">
		{#if loaded}
			{@render children()}
		{:else}
			<div class="flex items-center justify-center py-24">
				<span class="loading loading-spinner loading-sm" style="color:#00f9cf40;"></span>
			</div>
		{/if}
	</div>
</div>
