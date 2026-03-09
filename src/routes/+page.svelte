<script lang="ts">
	import {personas} from "../personas";
	import PersonaCard from "./PersonaCard.svelte";
	import {goto} from "$app/navigation";
	import {base} from '$app/paths';

	let idx: number = 0;

	$: selected = $personas[idx];
	$: fieldCounts = $personas.reduce((acc, p) => {
		acc[p.field] = (acc[p.field] ?? 0) + 1;
		return acc;
	}, {} as Record<string, number>);
	$: fields = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
</script>

<div class="flex flex-col gap-10">
	<!-- Hero header -->
	<div class="flex flex-col gap-3 pt-4">
		<div class="flex items-center gap-2 mb-1">
			<div class="w-2 h-2 rounded-full" style="background:#00f9cf; box-shadow: 0 0 8px #00f9cf;"></div>
			<span class="text-xs text-white/30 font-medium tracking-wide">Email Generation Portal</span>
		</div>
		<h1 class="text-5xl font-black tracking-tight leading-none">
			Generate<br/>
			<span style="background: linear-gradient(100deg, #00f9cf, #29b0ff 50%, #8c45ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
				targeted emails.
			</span>
		</h1>
		<p class="text-white/35 text-sm max-w-sm leading-relaxed">
			Build persona-to-persona email campaigns using AI-generated content tuned to each contact's profile.
		</p>
	</div>

	<!-- Action cards -->
	<div class="grid grid-cols-2 gap-3">
		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto(`${base}/list`)}>
			<div class="w-9 h-9 rounded-xl flex items-center justify-center text-base" style="background:#29b0ff15; color:#29b0ff;">
				👥
			</div>
			<div>
				<p class="font-semibold text-white text-sm">Browse Personas</p>
				<p class="text-xs text-white/35 mt-0.5">{$personas.length} contacts loaded</p>
			</div>
			<span class="text-white/20 text-xs mt-auto">View all →</span>
		</button>

		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto(`${base}/generate`)}>
			<div class="w-9 h-9 rounded-xl flex items-center justify-center text-base" style="background:#00f9cf15; color:#00f9cf;">
				✉️
			</div>
			<div>
				<p class="font-semibold text-white text-sm">Generate Emails</p>
				<p class="text-xs text-white/35 mt-0.5">Queue AI-generated campaigns</p>
			</div>
			<span class="text-white/20 text-xs mt-auto">Get started →</span>
		</button>
	</div>

	<!-- Field breakdown -->
	{#if fields.length > 0}
		<div class="flex flex-col gap-3">
			<p class="text-xs text-white/30 font-medium">Top fields</p>
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
				{#each fields as [field, count]}
					<div class="surface p-3 flex flex-col gap-1">
						<span class="text-xl font-bold text-white">{count}</span>
						<span class="text-xs text-white/40 truncate">{field}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="divider-glow"></div>

	<!-- Persona preview -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<p class="text-sm font-medium text-white/60">Preview a persona</p>
			<select class="field" style="width:auto; max-width:280px;" bind:value={idx}>
				{#each $personas as persona, i}
					<option value={i}>{persona.name} — {persona.company}</option>
				{/each}
			</select>
		</div>

		{#if selected}
			<PersonaCard persona={selected}/>
		{/if}
	</div>
</div>
