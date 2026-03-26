<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
</script>

<div class="flex flex-col items-center justify-center gap-6 py-24 text-center">
	<p class="text-6xl font-black tracking-tight text-white/20">{$page.status}</p>
	<h1 class="text-2xl font-bold text-white">Something went wrong</h1>
	<p class="text-sm text-white/40 max-w-md">{$page.error?.message ?? 'An unexpected error occurred.'}</p>
	<button
		class="px-4 py-2 rounded-2xl text-sm font-semibold border transition-all hover:-translate-y-[1px]"
		style="background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); color:#f8fbff;"
		on:click={() => goto(`${base}/`)}
	>
		Back to home
	</button>
</div>
