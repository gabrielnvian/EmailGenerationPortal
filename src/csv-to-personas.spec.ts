import { describe, it, expect } from 'vitest';
import { CsvToPersonas } from './csv-to-personas';

const header = 'name,jobTitle,company,field,phone,email,supervisorRow';

describe('CsvToPersonas', () => {
	it('parses a single persona with no supervisor', () => {
		const csv = `${header}\nAlice,Engineer,Acme,Tech,555-0001,alice@acme.com,`;
		const personas = CsvToPersonas(csv);
		expect(personas).toHaveLength(1);
		const p = personas[0];
		expect(p.name).toBe('Alice');
		expect(p.jobTitle).toBe('Engineer');
		expect(p.company).toBe('Acme');
		expect(p.field).toBe('Tech');
		expect(p.phone).toBe('555-0001');
		expect(p.email).toBe('alice@acme.com');
		expect(p.supervisor).toBeNull();
	});

	it('skips the header row', () => {
		const csv = `${header}\nAlice,Engineer,Acme,Tech,555-0001,alice@acme.com,`;
		const personas = CsvToPersonas(csv);
		expect(personas[0].name).toBe('Alice');
	});

	it('returns empty array for header-only CSV', () => {
		expect(CsvToPersonas(header)).toHaveLength(0);
	});

	it('skips empty lines', () => {
		const csv = `${header}\nAlice,Engineer,Acme,Tech,555-0001,alice@acme.com,\n\nBob,Manager,Acme,Tech,555-0002,bob@acme.com,`;
		expect(CsvToPersonas(csv)).toHaveLength(2);
	});

	it('handles CRLF line endings', () => {
		const csv = `${header}\r\nAlice,Engineer,Acme,Tech,555-0001,alice@acme.com,`;
		const personas = CsvToPersonas(csv);
		expect(personas).toHaveLength(1);
		expect(personas[0].name).toBe('Alice');
	});

	it('parses multiple personas', () => {
		const csv = [
			header,
			'Alice,Engineer,Acme,Tech,555-0001,alice@acme.com,',
			'Bob,Manager,Acme,Tech,555-0002,bob@acme.com,',
		].join('\n');
		expect(CsvToPersonas(csv)).toHaveLength(2);
	});

	it('assigns supervisor by row number (backward reference)', () => {
		// Row 2 = idx 0 = Alice; Row 3 = idx 1 = Bob
		// Bob's supervisor field is "2", meaning row 2 (Alice)
		const csv = [
			header,
			'Alice,Engineer,Acme,Tech,555-0001,alice@acme.com,',
			'Bob,Manager,Acme,Tech,555-0002,bob@acme.com,2',
		].join('\n');
		const personas = CsvToPersonas(csv);
		expect(personas[1].supervisor).toBe(personas[0]);
	});

	it('handles forward references in supervisor assignment', () => {
		// Alice (row 2) references Bob (row 3) who comes after her
		const csv = [
			header,
			'Alice,Engineer,Acme,Tech,555-0001,alice@acme.com,3',
			'Bob,Manager,Acme,Tech,555-0002,bob@acme.com,',
		].join('\n');
		const personas = CsvToPersonas(csv);
		expect(personas[0].supervisor).toBe(personas[1]);
	});

	it('prevents circular supervisor references', () => {
		// Alice (row 2) -> supervisor row 3 (Bob); Bob (row 3) -> supervisor row 2 (Alice)
		// Alice gets Bob assigned first; then Bob -> Alice would create a cycle, so Bob.supervisor stays null
		const csv = [
			header,
			'Alice,Engineer,Acme,Tech,555-0001,alice@acme.com,3',
			'Bob,Manager,Acme,Tech,555-0002,bob@acme.com,2',
		].join('\n');
		const personas = CsvToPersonas(csv);
		expect(personas[0].supervisor).toBe(personas[1]); // Alice -> Bob (set first)
		expect(personas[1].supervisor).toBeNull();         // Bob -> Alice would cycle
	});

	it('ignores out-of-range supervisor row numbers', () => {
		const csv = `${header}\nAlice,Engineer,Acme,Tech,555-0001,alice@acme.com,999`;
		expect(CsvToPersonas(csv)[0].supervisor).toBeNull();
	});

	it('ignores non-numeric supervisor field', () => {
		const csv = `${header}\nAlice,Engineer,Acme,Tech,555-0001,alice@acme.com,N/A`;
		expect(CsvToPersonas(csv)[0].supervisor).toBeNull();
	});

	it('parses quoted fields containing commas', () => {
		const csv = `${header}\n"Smith, Alice",Engineer,Acme,Tech,555-0001,alice@acme.com,`;
		expect(CsvToPersonas(csv)[0].name).toBe('Smith, Alice');
	});

	it('parses escaped double quotes inside quoted fields', () => {
		const csv = `${header}\n"Alice ""Al"" Smith",Engineer,Acme,Tech,555-0001,alice@acme.com,`;
		expect(CsvToPersonas(csv)[0].name).toBe('Alice "Al" Smith');
	});
});
