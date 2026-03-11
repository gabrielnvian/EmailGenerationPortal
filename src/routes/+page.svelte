<script lang="ts">
	import { onMount } from 'svelte';
	import { personas } from '../personas';
	import PersonaCard from './PersonaCard.svelte';
	import { goto } from '$app/navigation';

	let idx: number = 0;

	let showAddPersonaModal = false;
	let isSaving = false;
	let errorMessage = '';
	let successMessage = '';

	const MAX_NAME_LENGTH = 100;
	const MAX_JOB_TITLE_LENGTH = 120;
	const MAX_COMPANY_LENGTH = 120;
	const MAX_FIELD_LENGTH = 80;
	const MAX_PHONE_LENGTH = 15;
	const MIN_PHONE_LENGTH = 7;
	const MAX_EMAIL_LENGTH = 254;

	let form = {
		name: '',
		jobTitle: '',
		company: '',
		field: '',
		phone: '',
		email: '',
		supervisorEmail: '',
		isSelfSupervisor: false
	};

	$: selected = $personas[idx] ?? null;

	$: if (idx > $personas.length - 1) {
		idx = Math.max(0, $personas.length - 1);
	}

	$: fieldCounts = $personas.reduce((acc, p) => {
		acc[p.field] = (acc[p.field] ?? 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	$: fields = Object.entries(fieldCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4);

	$: supervisorOptions = [...$personas].sort((a, b) => a.name.localeCompare(b.name));

	$: if (form.isSelfSupervisor) {
		form.supervisorEmail = '';
	}

	$: duplicateNameWarning =
			form.name.trim() &&
			$personas.some((p) => p.name.trim().toLowerCase() === form.name.trim().toLowerCase())
					? 'Warning: a persona with this same name already exists.'
					: '';

	onMount(async () => {
		try {
			await personas.reload();
		} catch (err) {
			console.error(err);
		}
	});

	function openAddPersonaModal() {
		resetForm();
		errorMessage = '';
		showAddPersonaModal = true;
	}

	function closeAddPersonaModal() {
		if (isSaving) return;
		showAddPersonaModal = false;
		errorMessage = '';
	}

	function resetForm() {
		form = {
			name: '',
			jobTitle: '',
			company: '',
			field: '',
			phone: '',
			email: '',
			supervisorEmail: '',
			isSelfSupervisor: false
		};
	}

	function sanitizePhone() {
		form.phone = form.phone.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH);
	}

	function normalizeEmail(value: string) {
		return value.trim().toLowerCase();
	}

	function buildNormalizedPayload() {
		return {
			name: form.name.trim(),
			jobTitle: form.jobTitle.trim(),
			company: form.company.trim(),
			field: form.field.trim(),
			phone: form.phone.trim(),
			email: normalizeEmail(form.email),
			supervisorEmail: normalizeEmail(form.supervisorEmail),
			isSelfSupervisor: form.isSelfSupervisor
		};
	}

	function isValidEmail(value: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	}

	function validateForm(payload: ReturnType<typeof buildNormalizedPayload>): string {
		if (
				!payload.name ||
				!payload.jobTitle ||
				!payload.company ||
				!payload.field ||
				!payload.email
		) {
			return 'Please fill all required fields.';
		}

		if (payload.name.length > MAX_NAME_LENGTH) {
			return `Full Name cannot exceed ${MAX_NAME_LENGTH} characters.`;
		}

		if (payload.jobTitle.length > MAX_JOB_TITLE_LENGTH) {
			return `Job Title cannot exceed ${MAX_JOB_TITLE_LENGTH} characters.`;
		}

		if (payload.company.length > MAX_COMPANY_LENGTH) {
			return `Company cannot exceed ${MAX_COMPANY_LENGTH} characters.`;
		}

		if (payload.field.length > MAX_FIELD_LENGTH) {
			return `Field cannot exceed ${MAX_FIELD_LENGTH} characters.`;
		}

		if (payload.email.length > MAX_EMAIL_LENGTH) {
			return `Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`;
		}

		if (!isValidEmail(payload.email)) {
			return 'Enter a valid email address.';
		}

		if (payload.phone) {
			if (!/^\d+$/.test(payload.phone)) {
				return 'Phone number must contain digits only.';
			}

			if (payload.phone.length < MIN_PHONE_LENGTH || payload.phone.length > MAX_PHONE_LENGTH) {
				return `Phone number must be between ${MIN_PHONE_LENGTH} and ${MAX_PHONE_LENGTH} digits.`;
			}
		}

		if (!payload.isSelfSupervisor && !payload.supervisorEmail) {
			return 'Select a supervisor, or mark the persona as self-supervised.';
		}

		if (!payload.isSelfSupervisor && payload.supervisorEmail && !isValidEmail(payload.supervisorEmail)) {
			return 'Selected supervisor email is invalid.';
		}

		const sameEmailExists = $personas.some(
				(p) => p.email.trim().toLowerCase() === payload.email
		);
		if (sameEmailExists) {
			return 'That email already exists.';
		}

		const samePhoneExists =
				!!payload.phone &&
				$personas.some((p) => p.phone.trim() !== '' && p.phone.trim() === payload.phone);
		if (samePhoneExists) {
			return 'That phone number already exists.';
		}

		const sameNameAndCompanyExists = $personas.some(
				(p) =>
						p.name.trim().toLowerCase() === payload.name.toLowerCase() &&
						p.company.trim().toLowerCase() === payload.company.toLowerCase()
		);
		if (sameNameAndCompanyExists) {
			return 'That name + company combination already exists.';
		}

		return '';
	}

	async function savePersona() {
		errorMessage = '';
		successMessage = '';

		const payload = buildNormalizedPayload();
		const validationError = validateForm(payload);

		if (validationError) {
			errorMessage = validationError;
			return;
		}

		isSaving = true;

		try {
			const res = await fetch('./api/personas', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			const data = await res.json();

			if (!res.ok || !data.success) {
				errorMessage = data.error ?? 'Failed to save persona.';
				return;
			}

			await personas.reload();

			const newIndex = $personas.findIndex(
					(p) => p.email.trim().toLowerCase() === payload.email
			);

			if (newIndex >= 0) {
				idx = newIndex;
			} else {
				idx = Math.max(0, $personas.length - 1);
			}

			showAddPersonaModal = false;
			successMessage = data.warning
					? `Persona added successfully. ${data.warning}`
					: 'Persona added successfully.';

			resetForm();
		} catch (err) {
			console.error('savePersona failed:', err);
			errorMessage =
					err instanceof Error ? err.message : 'An unexpected error occurred while saving the persona.';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="flex flex-col gap-10">
	<div class="flex flex-col gap-3 pt-4">
		<div class="flex items-center gap-2 mb-1">
			<div class="w-2 h-2 rounded-full" style="background:#00f9cf; box-shadow: 0 0 8px #00f9cf;"></div>
			<span class="text-xs text-white/30 font-medium tracking-wide">Email Generation Portal</span>
		</div>
		<h1 class="text-5xl font-black tracking-tight leading-none">
			Generate<br />
			<span style="background: linear-gradient(100deg, #00f9cf, #29b0ff 50%, #8c45ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
				targeted emails.
			</span>
		</h1>
		<p class="text-white/35 text-sm max-w-sm leading-relaxed">
			Build persona-to-persona email campaigns using AI-generated content tuned to each contact's profile.
		</p>
	</div>

	{#if successMessage}
		<div
				class="rounded-2xl border px-4 py-3 text-sm"
				style="background:rgba(0, 249, 207, 0.08); border-color:rgba(0, 249, 207, 0.22); color:#d9fffb;"
		>
			{successMessage}
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-3">
		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto('list')}>
			<div class="w-9 h-9 rounded-xl flex items-center justify-center text-base" style="background:#29b0ff15; color:#29b0ff;">
				👥
			</div>
			<div>
				<p class="font-semibold text-white text-sm">Browse Personas</p>
				<p class="text-xs text-white/35 mt-0.5">{$personas.length} contacts loaded</p>
			</div>
			<span class="text-white/20 text-xs mt-auto">View all →</span>
		</button>

		<button class="surface-interactive p-5 flex flex-col gap-3 text-left" on:click={() => goto('generate')}>
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

	<div class="flex items-center justify-end">
		<button
				class="px-4 py-2 rounded-2xl text-sm font-semibold border transition-all hover:-translate-y-[1px]"
				style="background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); backdrop-filter:blur(14px); color:#f8fbff; box-shadow:0 10px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06);"
				on:click={openAddPersonaModal}
		>
			+ Add Persona
		</button>
	</div>

	<div class="divider-glow"></div>

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
			<PersonaCard persona={selected} />
		{/if}
	</div>
</div>

{#if showAddPersonaModal}
	<div
			class="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
			style="background:rgba(2,8,20,0.52); backdrop-filter:blur(10px);"
			on:click|self={closeAddPersonaModal}
	>
		<div
				class="w-full max-w-2xl rounded-[28px] border p-6 md:p-7"
				style="background:linear-gradient(180deg, rgba(8,8,12,0.82), rgba(5,12,25,0.78)); border-color:rgba(255,255,255,0.10); backdrop-filter:blur(20px); box-shadow:0 24px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);"
		>
			<div class="flex items-start justify-between gap-4 mb-6">
				<div class="flex flex-col gap-2">
					<div class="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
						 style="border-color:rgba(140,69,255,0.5); color:#00f9cf; background:rgba(140,69,255,0.08);">
						Add Custom Persona
					</div>
					<h2 class="text-3xl font-black tracking-tight text-white">Create a new persona</h2>
					<p class="text-sm leading-relaxed text-white/45 max-w-xl">
						Add a custom contact to the persona list. This will be appended to the CSV and shown immediately in the app.
					</p>
				</div>

				<button
						class="h-10 w-10 rounded-full border text-white/70 hover:text-white transition"
						style="border-color:rgba(255,255,255,0.10); background:rgba(255,255,255,0.03);"
						on:click={closeAddPersonaModal}
						aria-label="Close add persona modal"
				>
					✕
				</button>
			</div>

			{#if errorMessage}
				<div
						class="mb-4 rounded-2xl border px-4 py-3 text-sm"
						style="background:rgba(255,107,107,0.08); border-color:rgba(255,107,107,0.22); color:#ffdede;"
				>
					{errorMessage}
				</div>
			{/if}

			{#if duplicateNameWarning}
				<div
						class="mb-4 rounded-2xl border px-4 py-3 text-sm"
						style="background:rgba(255,193,7,0.08); border-color:rgba(255,193,7,0.22); color:#fff2c7;"
				>
					{duplicateNameWarning}
				</div>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/65 font-medium" for="persona-name">Full Name</label>
					<input id="persona-name" class="field" bind:value={form.name} placeholder="Name" maxlength={MAX_NAME_LENGTH} required />
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/65 font-medium" for="persona-job-title">Job Title</label>
					<input id="persona-job-title" class="field" bind:value={form.jobTitle} placeholder="Job Title" maxlength={MAX_JOB_TITLE_LENGTH} required />
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/65 font-medium" for="persona-company">Company</label>
					<input id="persona-company" class="field" bind:value={form.company} placeholder="Company" maxlength={MAX_COMPANY_LENGTH} required />
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/65 font-medium" for="persona-field">Field</label>
					<input id="persona-field" class="field" bind:value={form.field} placeholder="Field" maxlength={MAX_FIELD_LENGTH} required />
				</div>

				<div class="flex flex-col gap-2">
					<label class="text-sm text-white/65 font-medium" for="persona-phone">Phone (optional)</label>
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
					<label class="text-sm text-white/65 font-medium" for="persona-email">Email Address</label>
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

			<div class="mt-5 rounded-2xl border p-4"
				 style="background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.08);">
				<div class="flex items-start gap-3">
					<input
							id="self-supervisor"
							type="checkbox"
							class="mt-1"
							bind:checked={form.isSelfSupervisor}
					/>
					<div class="flex flex-col gap-2">
						<label for="self-supervisor" class="text-sm font-medium text-white/80">
							This persona is self-supervised
						</label>
						<p class="text-xs leading-relaxed text-white/45">
							The supervisors are stored by row number. If this person supervises themself, their own row number will be saved as supervisor reference. Otherwise, the supervisor can be selected below.
						</p>
					</div>
				</div>

				<div class="mt-4 flex flex-col gap-2">
					<label class="text-sm text-white/65 font-medium" for="persona-supervisor">Supervisor</label>
					<select
							id="persona-supervisor"
							class="field"
							bind:value={form.supervisorEmail}
							disabled={form.isSelfSupervisor}
					>
						<option value="">Select supervisor</option>
						{#each supervisorOptions as supervisor}
							<option value={supervisor.email}>
								{supervisor.name} — {supervisor.company}
							</option>
						{/each}
					</select>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-end gap-3">
				<button
						class="px-4 py-2 rounded-2xl text-sm font-semibold border text-white/80 hover:text-white transition"
						style="border-color:rgba(255,255,255,0.10); background:rgba(255,255,255,0.03);"
						on:click={closeAddPersonaModal}
						disabled={isSaving}
				>
					Cancel
				</button>

				<button
						class="px-4 py-2 rounded-2xl text-sm font-semibold transition-all disabled:opacity-60"
						style="background:linear-gradient(100deg, #00f9cf, #29b0ff 50%, #8c45ff); color:#02111f; box-shadow:0 10px 30px rgba(41,176,255,0.25);"
						on:click={savePersona}
						disabled={isSaving}
				>
					{#if isSaving}
						Saving...
					{:else}
						Save Persona
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}