import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PersonaCard from './PersonaCard.svelte';
import { Persona } from '../personas.model';

const alice = new Persona('Alice Smith', 'Software Engineer', 'Acme Corp', 'Technology', '555-0001', 'alice@acme.com');
const boss = new Persona('Bob Jones', 'CTO', 'Acme Corp', 'Technology', '555-0002', 'bob@acme.com');
const aliceWithBoss = new Persona('Alice Smith', 'Software Engineer', 'Acme Corp', 'Technology', '555-0001', 'alice@acme.com', boss);

describe('PersonaCard', () => {
	it('renders name and job title', async () => {
		render(PersonaCard, { props: { persona: alice } });
		await expect.element(page.getByText('Alice Smith')).toBeInTheDocument();
		await expect.element(page.getByText('Software Engineer')).toBeInTheDocument();
	});

	it('renders company, email and phone', async () => {
		render(PersonaCard, { props: { persona: alice } });
		await expect.element(page.getByText('Acme Corp')).toBeInTheDocument();
		await expect.element(page.getByText('alice@acme.com')).toBeInTheDocument();
		await expect.element(page.getByText('555-0001')).toBeInTheDocument();
	});

	it('renders field badge', async () => {
		render(PersonaCard, { props: { persona: alice } });
		await expect.element(page.getByText('Technology')).toBeInTheDocument();
	});

	it('derives two-letter initials from name', async () => {
		render(PersonaCard, { props: { persona: alice } });
		await expect.element(page.getByText('AS')).toBeInTheDocument();
	});

	it('shows supervisor section when persona has a supervisor', async () => {
		render(PersonaCard, { props: { persona: aliceWithBoss } });
		await expect.element(page.getByText('Reports to')).toBeInTheDocument();
		await expect.element(page.getByText('Bob Jones')).toBeInTheDocument();
	});

	it('hides supervisor section when noSup is true', async () => {
		render(PersonaCard, { props: { persona: aliceWithBoss, noSup: true } });
		await expect.element(page.getByText('Reports to')).not.toBeInTheDocument();
	});

	it('does not show supervisor section when persona has no supervisor', async () => {
		render(PersonaCard, { props: { persona: alice } });
		await expect.element(page.getByText('Reports to')).not.toBeInTheDocument();
	});

	it('renders compact view when isSup is true', async () => {
		render(PersonaCard, { props: { persona: alice, isSup: true } });
		await expect.element(page.getByText('Alice Smith')).toBeInTheDocument();
		await expect.element(page.getByText('Software Engineer')).toBeInTheDocument();
		// Compact view omits company and contact info
		await expect.element(page.getByText('Acme Corp')).not.toBeInTheDocument();
		await expect.element(page.getByText('alice@acme.com')).not.toBeInTheDocument();
	});
});
