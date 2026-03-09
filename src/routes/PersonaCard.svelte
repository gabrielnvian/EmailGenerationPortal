<script lang="ts">
	import type {Persona} from "../personas.model";

	export let persona: Persona;
	export let noSup: boolean = false;
	export let isSup: boolean = false;

	$: showSup = persona.supervisor && !noSup;

	const PALETTE = [
		{ bg: '#00f9cf18', text: '#00f9cf' },
		{ bg: '#8c45ff18', text: '#8c45ff' },
		{ bg: '#29b0ff18', text: '#29b0ff' },
		{ bg: '#ff6b9d18', text: '#ff6b9d' },
		{ bg: '#ffd93d18', text: '#ffd93d' },
	];
	$: color = PALETTE[persona.name.charCodeAt(0) % PALETTE.length];
	$: initials = persona.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
</script>

{#if isSup}
	<!-- Compact supervisor view -->
	<div class="flex items-center gap-3 pl-3 border-l-2 border-[#1e1e2a] py-1">
		<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
			style="background:{color.bg}; color:{color.text};">
			{initials}
		</div>
		<div>
			<p class="text-sm font-medium text-white leading-tight">{persona.name}</p>
			<p class="text-xs text-white/40 leading-tight">{persona.jobTitle}</p>
		</div>
	</div>
{:else}
	<div class="surface p-4 flex flex-col gap-3 w-full">
		<!-- Top row: avatar + name -->
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
				style="background:{color.bg}; color:{color.text};">
				{initials}
			</div>
			<div class="flex-1 min-w-0">
				<p class="font-semibold text-white text-sm leading-tight truncate">{persona.name}</p>
				<p class="text-xs text-white/50 leading-tight truncate">{persona.jobTitle}</p>
			</div>
			<span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
				style="background:{color.bg}; color:{color.text};">
				{persona.field}
			</span>
		</div>

		<!-- Company + contact -->
		<div class="flex flex-col gap-1 text-xs text-white/40 border-t border-[#1e1e2a] pt-3">
			<span class="text-white/60">{persona.company}</span>
			<div class="flex gap-4">
				<span>{persona.email}</span>
				<span>{persona.phone}</span>
			</div>
		</div>

		{#if showSup}
			<div class="border-t border-[#1e1e2a] pt-3">
				<p class="text-xs text-white/25 mb-2">Reports to</p>
				<svelte:self isSup persona={persona.supervisor}/>
			</div>
		{/if}
	</div>
{/if}
