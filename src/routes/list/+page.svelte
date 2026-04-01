<script lang="ts">
	import {base} from "$app/paths";
	import {personas} from "../../personas";
	import type {Persona} from "../../personas.model";
	import PersonaCard from "../PersonaCard.svelte";
	import PersonaFormModal from "../PersonaFormModal.svelte";
	import {goto} from "$app/navigation";

	let search = "";
	let showModal = false;
	let successMessage = '';
	let deleteError = '';
	let modalRef: PersonaFormModal;

	$: filtered = search.trim()
		? $personas.filter(p =>
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			p.company.toLowerCase().includes(search.toLowerCase()) ||
			p.field.toLowerCase().includes(search.toLowerCase()))
		: $personas;

	function openEditModal(persona: Persona) {
		modalRef.populateForEdit(persona);
		showModal = true;
	}

	function handleModalClose() {
		showModal = false;
	}

	function handleSaved(event: CustomEvent<{ message: string }>) {
		showModal = false;
		successMessage = event.detail.message;
	}

	async function handleDelete(persona: Persona) {
		if (!confirm(`Delete "${persona.name}"? Any personas supervised by them will have their supervisor cleared.`)) {
			return;
		}

		deleteError = '';
		try {
			const res = await fetch(`${base}/api/personas`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: persona.id })
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				deleteError = data.error ?? 'Failed to delete persona.';
				return;
			}
			await personas.reload();
			successMessage = `"${persona.name}" deleted successfully.`;
		} catch {
			deleteError = 'An unexpected error occurred while deleting.';
		}
	}
</script>

<div class="flex flex-col gap-8">
	<!-- Header -->
	<div class="flex flex-col gap-2 pt-4">
		<button class="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors w-fit" on:click={() => goto(`${base}/`)}>
			← Back
		</button>
		<div class="flex items-end gap-3">
			<h1 class="text-4xl font-black tracking-tight">Personas</h1>
			<span class="text-white/40 text-sm mb-1">{filtered.length} of {$personas.length}</span>
		</div>
		<div class="divider-glow"></div>
	</div>

	{#if successMessage}
		<div class="alert-success" role="alert">{successMessage}</div>
	{/if}

	{#if deleteError}
		<div class="alert-error" role="alert">{deleteError}</div>
	{/if}

	<!-- Search -->
	<input
		class="field"
		placeholder="Search by name, company or field..."
		bind:value={search}
	/>

	<!-- Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
		{#each filtered as persona (persona.id)}
			<div class="flex flex-col gap-2">
				<PersonaCard {persona}/>
				<div class="flex gap-2 justify-end">
					<button class="btn-glass text-xs py-1 px-2.5" on:click={() => openEditModal(persona)}>
						Edit
					</button>
					<button
						class="btn-glass text-xs py-1 px-2.5"
						style="color:rgba(255,100,100,0.7); border-color:rgba(255,80,80,0.15);"
						on:click={() => handleDelete(persona)}
					>
						Delete
					</button>
				</div>
			</div>
		{/each}
	</div>

	{#if filtered.length === 0}
		<p class="text-center text-white/30 text-sm py-12">No personas match your search.</p>
	{/if}
</div>

<PersonaFormModal
	bind:this={modalRef}
	visible={showModal}
	on:close={handleModalClose}
	on:saved={handleSaved}
/>
