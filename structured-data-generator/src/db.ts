import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

import type {
  GenerateRequest,
  GenerateResult,
  GenerationRow,
  GenerationListRow,
  SearchParams,
  SearchResult,
} from './types.js';

const DB_PATH = process.env.DB_PATH || new URL('../data/generations.db', import.meta.url).pathname;

let db: DatabaseType | null = null;

function getDb(): DatabaseType {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      request JSON NOT NULL,
      response JSON NOT NULL,
      domain TEXT NOT NULL DEFAULT 'email',
      persona_0_name TEXT,
      persona_0_email TEXT,
      persona_1_name TEXT,
      persona_1_email TEXT,
      relationship TEXT,
      arc TEXT,
      thread_count INTEGER,
      message_count INTEGER,
      timespan_days INTEGER,
      duration_ms INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_gen_relationship ON generations(relationship);
    CREATE INDEX IF NOT EXISTS idx_gen_arc ON generations(arc);
    CREATE INDEX IF NOT EXISTS idx_gen_persona_names ON generations(persona_0_name, persona_1_name);
  `);

  // Migrations for existing DBs
  const columns = db.pragma('table_info(generations)') as Array<{ name: string }>;
  const colNames = columns.map((c) => c.name);

  // Migration: rename format → domain
  if (colNames.includes('format') && !colNames.includes('domain')) {
    db.exec(`ALTER TABLE generations RENAME COLUMN format TO domain`);
    db.exec(`UPDATE generations SET domain = 'email' WHERE domain IN ('gmail', 'outlook')`);
    db.exec(`UPDATE generations SET domain = 'calendar' WHERE domain = 'gcal'`);
  }

  // Migration: add domain column if neither format nor domain exists
  if (!colNames.includes('format') && !colNames.includes('domain')) {
    db.exec(`ALTER TABLE generations ADD COLUMN domain TEXT NOT NULL DEFAULT 'email'`);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_gen_domain ON generations(domain)`);

  // Migration: add model column
  if (!colNames.includes('model')) {
    db.exec(`ALTER TABLE generations ADD COLUMN model TEXT`);
  }

  process.on('SIGTERM', () => {
    if (db) {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    }
    process.exit(0);
  });

  return db;
}

function saveGeneration({
  request,
  response,
  durationMs,
  model,
}: {
  request: GenerateRequest;
  response: GenerateResult;
  durationMs: number;
  model?: string;
}): number | bigint {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO generations (
      request, response, domain,
      persona_0_name, persona_0_email,
      persona_1_name, persona_1_email,
      relationship, arc,
      thread_count, message_count, timespan_days, duration_ms, model
    ) VALUES (
      @request, @response, @domain,
      @p0name, @p0email,
      @p1name, @p1email,
      @relationship, @arc,
      @threadCount, @messageCount, @timespanDays, @durationMs, @model
    )
  `);

  const result = stmt.run({
    request: JSON.stringify(request),
    response: JSON.stringify(response),
    domain: response.domain || 'email',
    p0name: request.personas[0]?.name || null,
    p0email: request.personas[0]?.email || null,
    p1name: request.personas[1]?.name || null,
    p1email: request.personas[1]?.email || null,
    relationship: request.relationship || null,
    arc: response.summary?.arcDescription || null,
    threadCount: response.timeline?.length || 0,
    messageCount: response.summary?.totalMessages || 0,
    timespanDays: response.summary?.timespanDays || 0,
    durationMs: durationMs || 0,
    model: model ?? null,
  });

  db.pragma('wal_checkpoint(PASSIVE)');
  return result.lastInsertRowid;
}

function addLikeFilter(
  conditions: string[],
  params: (string | number)[],
  columns: string[],
  value: string,
): void {
  conditions.push(`(${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`);
  const like = `%${value}%`;
  params.push(...columns.map(() => like));
}

function searchGenerations({
  query,
  persona,
  sentiment,
  domain,
  limit = 50,
  offset = 0,
}: SearchParams = {}): SearchResult {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query) {
    addLikeFilter(conditions, params, ['relationship', 'arc', 'persona_0_name', 'persona_1_name'], query);
  }

  if (persona) {
    addLikeFilter(conditions, params, ['persona_0_name', 'persona_1_name', 'persona_0_email', 'persona_1_email'], persona);
  }

  if (sentiment) {
    addLikeFilter(conditions, params, ['arc'], sentiment);
  }

  if (domain) {
    conditions.push('domain = ?');
    params.push(domain);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM generations ${where}`).get(...params) as
    | { total: number }
    | undefined;

  const rows = db.prepare(`
    SELECT id, created_at, domain, persona_0_name, persona_0_email,
           persona_1_name, persona_1_email,
           relationship, arc, thread_count, message_count,
           timespan_days, duration_ms, model
    FROM generations
    ${where}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as GenerationListRow[];

  return { rows, total: countRow?.total ?? 0 };
}

function getGeneration(id: number): GenerationRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM generations WHERE id = ?').get(id) as GenerationRow | undefined;
}

function deleteGeneration(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM generations WHERE id = ?').run(id);
  return result.changes > 0;
}

export { saveGeneration, searchGenerations, getGeneration, deleteGeneration };
