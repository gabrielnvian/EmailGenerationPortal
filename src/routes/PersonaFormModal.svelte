<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { base } from '$app/paths';
	import { personas } from '../personas';
	import type { Persona } from '../personas.model';
	import {
		MAX_NAME_LENGTH, MAX_JOB_TITLE_LENGTH, MAX_COMPANY_LENGTH,
		MAX_FIELD_LENGTH, MAX_PHONE_LENGTH, MIN_PHONE_LENGTH, MAX_EMAIL_LENGTH,
		validatePersonaInput, normalize
	} from '$lib/shared/validation';

	export let visible: boolean = false;

	const dispatch = createEventDispatcher<{ close: void; saved: { message: string } }>();

	let mode: 'create' | 'edit' = 'create';
	let editingId: number | undefined = undefined;
	let isSaving = false;
	let errorMessage = '';

	let form = {
		name: '',
		jobTitle: '',
		company: '',
		field: '',
		phone: '',
		email: '',
		supervisorId: null as number | null,
		isSelfSupervisor: false,
		personality: '',
		signature: ''
	};

	$: supervisorOptions = [...$personas].sort((a, b) => a.name.localeCompare(b.name));

	$: duplicateNameWarning = (() => {
		const trimmedName = form.name.trim();
		if (!trimmedName) return '';
		const match = $personas.some(
			p => p.id !== editingId && normalize(p.name) === normalize(trimmedName)
		);
		return match ? 'Warning: a persona with this same name already exists.' : '';
	})();

	export function populateForEdit(persona: Persona) {
		mode = 'edit';
		editingId = persona.id;
		const isSelf = persona.supervisor != null && persona.supervisor.id === persona.id;
		form = {
			name: persona.name,
			jobTitle: persona.jobTitle,
			company: persona.company,
			field: persona.field,
			phone: persona.phone,
			email: persona.email,
			supervisorId: isSelf ? null : (persona.supervisor?.id ?? null),
			isSelfSupervisor: isSelf,
			personality: persona.personality ?? '',
			signature: persona.signature ?? ''
		};
		errorMessage = '';
	}

	export function populateForCreate() {
		mode = 'create';
		editingId = undefined;
		resetForm();
	}

	function resetForm() {
		form = {
			name: '',
			jobTitle: '',
			company: '',
			field: '',
			phone: '',
			email: '',
			supervisorId: null,
			isSelfSupervisor: false,
			personality: '',
			signature: ''
		};
		errorMessage = '';
	}

	function handleSelfSupervisorChange() {
		if (form.isSelfSupervisor) {
			form.supervisorId = null;
		}
	}

	function sanitizePhone() {
		form.phone = form.phone.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH);
	}

	function close() {
		if (isSaving) return;
		errorMessage = '';
		dispatch('close');
	}

	async function save() {
		errorMessage = '';

		const payload = {
			name: form.name.trim(),
			jobTitle: form.jobTitle.trim(),
			company: form.company.trim(),
			field: form.field.trim(),
			phone: form.phone.trim(),
			email: form.email.trim().toLowerCase(),
			supervisorId: form.supervisorId,
			isSelfSupervisor: form.isSelfSupervisor,
			personality: form.personality.trim(),
			signature: form.signature.trim()
		};

		// Client-side validation
		const validationError = validatePersonaInput(
			payload,
			$personas,
			editingId
		);

		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isSaving = true;

		try {
			const isEdit = mode === 'edit' && editingId != null;
			const res = await fetch(`${base}/api/personas`, {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(isEdit ? { ...payload, id: editingId } : payload)
			});

			const data = await res.json();

			if (!res.ok || !data.success) {
				errorMessage = data.error ?? `Failed to ${mode === 'edit' ? 'update' : 'save'} persona.`;
				return;
			}

			await personas.reload();

			const actionLabel = mode === 'edit' ? 'updated' : 'added';
			const message = data.warning
				? `Persona ${actionLabel} successfully. ${data.warning}`
				: `Persona ${actionLabel} successfully.`;

			resetForm();
			dispatch('saved', { message });
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
		} finally {
			isSaving = false;
		}
	}
</script>

{#if visible}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
		style="background:rgba(4,6,16,0.65); backdrop-filter:blur(20px);"
		on:click|self={close}
	>
		<div
			class="w-full max-w-2xl rounded-[24px] border p-6 md:p-7 overflow-y-auto max-h-[90vh]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="persona-form-title"
			style="background:linear-gradient(180deg, #171824, #12131e); border-color:rgba(255,255,255,0.10); backdrop-filter:blur(24px); box-shadow:0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05);"
		>
			<div class="flex items-start justify-between gap-4 mb-6">
				<div class="flex flex-col gap-2">
					<div class="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
						 style="border-color:rgba(140,69,255,0.5); color:#00f9cf; background:rgba(140,69,255,0.08);">
						{mode === 'edit' ? 'Edit Persona' : 'Add Custom Persona'}
					</div>
					<h2 id="persona-form-title" class="text-3xl font-black tracking-tight text-white">
						{mode === 'edit' ? 'Edit persona' : 'Create a new persona'}
					</h2>
					<p class="text-sm leading-relaxed text-white/60 max-w-xl">
						{mode === 'edit'
							? 'Update this persona\'s details. Changes will be saved to the database immediately.'
							: 'Add a custom contact to the persona list. This will be saved to the database and shown immediately in the app.'}
					</p>
				</div>

				<button
					class="h-10 w-10 rounded-full border text-white/70 hover:text-white transition flex-shrink-0"
					style="border-color:rgba(255,255,255,0.10); background:rgba(255,255,255,0.03);"
					on:click={close}
					aria-label="Close persona form"
				>
					✕
				</button>
			</div>

			{#if errorMessage}
				<div class="alert-error mb-4" role="alert">{errorMessage}</div>
			{/if}

			{#if duplicateNameWarning}
				<div class="alert-warning mb-4">{duplicateNameWarning}</div>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-name">Full Name</label>
					<input id="persona-name" class="field" bind:value={form.name} placeholder="Name"
						   maxlength={MAX_NAME_LENGTH} required/>
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-job-title">Job Title</label>
					<input id="persona-job-title" class="field" bind:value={form.jobTitle} placeholder="Job Title"
						   maxlength={MAX_JOB_TITLE_LENGTH} required/>
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-company">Company</label>
					<input id="persona-company" class="field" bind:value={form.company} placeholder="Company"
						   maxlength={MAX_COMPANY_LENGTH} required/>
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-field">Field</label>
					<input id="persona-field" class="field" bind:value={form.field} placeholder="Field"
						   maxlength={MAX_FIELD_LENGTH} required/>
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-phone">Phone (optional)</label>
					<input
						id="persona-phone"
						class="field"
						bind:value={form.phone}
						on:input={sanitizePhone}
						inputmode="numeric"
						placeholder="Digits only"
						maxlength={MAX_PHONE_LENGTH}
					/>
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-email">Email Address</label>
					<input
						id="persona-email"
						class="field"
						bind:value={form.email}
						type="email"
						placeholder="Email"
						maxlength={MAX_EMAIL_LENGTH}
						autocomplete="off"
						required
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 mt-4">
				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-personality">
						Personality <span class="text-white/30 font-normal text-xs">optional</span>
					</label>
					<textarea
						id="persona-personality"
						class="field h-20 resize-none"
						placeholder="Demanding, impatient, passive-aggressive when deadlines slip. Name-drops credentials."
						bind:value={form.personality}
					></textarea>
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-signature">
						Email Signature <span class="text-white/30 font-normal text-xs">optional</span>
					</label>
					<textarea
						id="persona-signature"
						class="field h-24 resize-none font-mono text-xs"
						placeholder={"Derek Huang\nMechanical Engineer, Brightwater Engineering\n415-832-7194 | derek@brightwatereng.com"}
						bind:value={form.signature}
					></textarea>
				</div>
			</div>

			<div class="mt-5 rounded-2xl border p-4"
				 style="background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.10);">
				<div class="flex items-start gap-3">
					<input
						id="self-supervisor"
						type="checkbox"
						class="mt-1"
						bind:checked={form.isSelfSupervisor}
						on:change={handleSelfSupervisorChange}
					/>
					<div class="flex flex-col gap-2">
						<label for="self-supervisor" class="text-sm font-medium text-white/80">
							This persona is self-supervised
						</label>
						<p class="text-xs leading-relaxed text-white/55">
							If this person supervises themself, their own ID will be saved as supervisor reference.
							Otherwise, select a supervisor below.
						</p>
					</div>
				</div>

				<div class="mt-4 flex flex-col gap-2">
					<label class="text-sm text-white/80 font-medium" for="persona-supervisor">Supervisor</label>
					<select
						id="persona-supervisor"
						class="field"
						bind:value={form.supervisorId}
						disabled={form.isSelfSupervisor}
					>
						<option value={null}>Select supervisor</option>
						{#each supervisorOptions as supervisor (supervisor.id)}
							{#if supervisor.id !== editingId}
								<option value={supervisor.id}>
									{supervisor.name} — {supervisor.company}
								</option>
							{/if}
						{/each}
					</select>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-end gap-3">
				<button class="btn-glass" on:click={close} disabled={isSaving}>
					Cancel
				</button>

				<button
					class="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
					style="background:linear-gradient(100deg, #00f9cf, #29b0ff 50%, #8c45ff); color:#02111f; box-shadow:0 8px 24px rgba(41,176,255,0.20);"
					on:click={save}
					disabled={isSaving}
				>
					{#if isSaving}
						Saving...
					{:else}
						{mode === 'edit' ? 'Update Persona' : 'Save Persona'}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
