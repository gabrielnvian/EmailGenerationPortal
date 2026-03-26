import Database from 'better-sqlite3';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'data', 'personas.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!_db) {
		_db = new Database(DB_PATH);
		_db.pragma('journal_mode = WAL');
		_db.pragma('foreign_keys = ON');
		_db.exec(`
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
	}
	return _db;
}
