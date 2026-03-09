<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div data-theme="feather" style="min-height:100vh; background:#08080c; position:relative; overflow:hidden;">
	<!-- Ambient background glow -->
	<div style="position:fixed; top:-160px; left:50%; transform:translateX(-50%); width:900px; height:500px; background:radial-gradient(ellipse, #00f9cf09 0%, transparent 65%); pointer-events:none; z-index:0;"></div>

	<div style="position:relative; z-index:1;" class="container mx-auto max-w-4xl px-5 py-10">
		{@render children()}
	</div>
</div>
