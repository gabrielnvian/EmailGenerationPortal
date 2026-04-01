<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
</script>

<div class="flex flex-col items-center justify-center gap-6 py-24 text-center">
	<p class="text-6xl font-black tracking-tight text-white/10">{$page.status}</p>
	<h1 class="text-2xl font-bold text-white">Something went wrong</h1>
	<p class="text-sm text-white/35 max-w-md">{$page.error?.message ?? 'An unexpected error occurred.'}</p>
	<button class="btn-glass" on:click={() => goto(`${base}/`)}>
		Back to home
	</button>
</div>
