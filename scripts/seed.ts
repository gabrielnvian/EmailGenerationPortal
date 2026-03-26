import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const CSV_PATH = path.resolve(process.cwd(), 'src', 'data.csv');
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.resolve(DB_DIR, 'personas.db');

function parseCSVLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			fields.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	fields.push(current);
	return fields;
}

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
	fs.mkdirSync(DB_DIR, { recursive: true });
}

// Remove existing DB if present
if (fs.existsSync(DB_PATH)) {
	fs.unlinkSync(DB_PATH);
	console.log('Removed existing database.');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
	CREATE TABLE IF NOT EXISTS personas (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		name          TEXT NOT NULL,
		job_title     TEXT NOT NULL,
		company       TEXT NOT NULL,
		field         TEXT NOT NULL,
		phone         TEXT NOT NULL DEFAULT '',
		email         TEXT NOT NULL UNIQUE,
		supervisor_id INTEGER REFERENCES personas(id) ON DELETE SET NULL
	);
	CREATE INDEX IF NOT EXISTS idx_personas_supervisor ON personas(supervisor_id);
`);

const csv = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = csv.split(/\r?\n/);

type CsvRow = {
	name: string;
	jobTitle: string;
	company: string;
	field: string;
	phone: string;
	email: string;
	supervisorRowNum: number;
};

// Parse all CSV rows
const rows: CsvRow[] = [];
for (let i = 1; i < lines.length; i++) {
	if (!lines[i].trim()) continue;
	const fields = parseCSVLine(lines[i]);
	rows.push({
		name: fields[0] ?? '',
		jobTitle: fields[1] ?? '',
		company: fields[2] ?? '',
		field: fields[3] ?? '',
		phone: fields[4] ?? '',
		email: fields[5] ?? '',
		supervisorRowNum: parseInt(fields[6] ?? '')
	});
}

console.log(`Parsed ${rows.length} personas from CSV.`);

// Pass 1: Insert all personas without supervisors
const insertStmt = db.prepare(`
	INSERT INTO personas (name, job_title, company, field, phone, email, supervisor_id)
	VALUES (?, ?, ?, ?, ?, ?, NULL)
`);

// Map from CSV data index (0-based) to DB id
const csvIndexToDbId = new Map<number, number>();

const insertAll = db.transaction(() => {
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const result = insertStmt.run(row.name, row.jobTitle, row.company, row.field, row.phone, row.email);
		csvIndexToDbId.set(i, result.lastInsertRowid as number);
	}
});

insertAll();
console.log(`Inserted ${rows.length} personas.`);

// Pass 2: Assign supervisors
const updateSupervisorStmt = db.prepare('UPDATE personas SET supervisor_id = ? WHERE id = ?');

const assignSupervisors = db.transaction(() => {
	let assigned = 0;
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (isNaN(row.supervisorRowNum)) continue;

		// CSV row number is 1-based (row 1 = header, row 2 = first data row = index 0)
		const supervisorCsvIndex = row.supervisorRowNum - 2;
		const personaDbId = csvIndexToDbId.get(i)!;
		const supervisorDbId = csvIndexToDbId.get(supervisorCsvIndex);

		if (supervisorDbId != null) {
			updateSupervisorStmt.run(supervisorDbId, personaDbId);
			assigned++;
		}
	}
	return assigned;
});

const assignedCount = assignSupervisors();
console.log(`Assigned ${assignedCount} supervisor relationships.`);

// Verify
const count = db.prepare('SELECT COUNT(*) as count FROM personas').get() as { count: number };
const withSupervisor = db.prepare('SELECT COUNT(*) as count FROM personas WHERE supervisor_id IS NOT NULL').get() as { count: number };
const selfSupervised = db.prepare('SELECT COUNT(*) as count FROM personas WHERE supervisor_id = id').get() as { count: number };

console.log(`\nDatabase seeded successfully:`);
console.log(`  Total personas: ${count.count}`);
console.log(`  With supervisor: ${withSupervisor.count}`);
console.log(`  Self-supervised: ${selfSupervised.count}`);
console.log(`  Database: ${DB_PATH}`);

db.close();
