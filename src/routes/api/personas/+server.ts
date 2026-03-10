import { json } from '@sveltejs/kit';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CsvToPersonas } from '../../../csv-to-personas';

const CSV_PATH = path.resolve(process.cwd(), 'src', 'data.csv');

type CreatePersonaBody = {
  name?: string;
  jobTitle?: string;
  company?: string;
  field?: string;
  phone?: string;
  email?: string;
  supervisorEmail?: string;
  isSelfSupervisor?: boolean;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function escapeCsv(value: string): string {
  const safe = value ?? '';
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function isDigitsOnly(value: string): boolean {
  return /^\d+$/.test(value);
}

export async function GET() {
  const csv = await fs.readFile(CSV_PATH, 'utf-8');
  return json({ csv });
}

export async function POST({ request }) {
  const body = (await request.json()) as CreatePersonaBody;

  const name = (body.name ?? '').trim();
  const jobTitle = (body.jobTitle ?? '').trim();
  const company = (body.company ?? '').trim();
  const field = (body.field ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const email = (body.email ?? '').trim();
  const supervisorEmail = (body.supervisorEmail ?? '').trim();
  const isSelfSupervisor = Boolean(body.isSelfSupervisor);

  if (!name || !jobTitle || !company || !field || !email) {
    return json(
      { success: false, error: 'All fields are required except phone. Supervisor is required unless this persona is self-supervised.' },
      { status: 400 }
    );
  }

  if (phone && !isDigitsOnly(phone)) {
    return json({ success: false, error: 'Phone number must contain digits only.' }, { status: 400 });
  }

  if (!isSelfSupervisor && !supervisorEmail) {
    return json({ success: false, error: 'Select a supervisor, or mark the persona as self-supervised.' }, { status: 400 });
  }

  const csv = await fs.readFile(CSV_PATH, 'utf-8');
  const personas = CsvToPersonas(csv);

  const emailKey = normalize(email);
  const nameKey = normalize(name);
  const companyKey = normalize(company);
  const phoneKey = phone.trim();

  if (personas.some((p) => normalize(p.email) === emailKey)) {
    return json({ success: false, error: 'That email already exists.' }, { status: 409 });
  }

  if (phoneKey && personas.some((p) => (p.phone ?? '').trim() !== '' && p.phone.trim() === phoneKey)) {
    return json({ success: false, error: 'That phone number already exists.' }, { status: 409 });
  }

  if (personas.some((p) => normalize(p.name) === nameKey && normalize(p.company) === companyKey)) {
    return json({ success: false, error: 'That name + company combination already exists.' }, { status: 409 });
  }

  const sameNameExists = personas.some((p) => normalize(p.name) === nameKey);

  let supervisorRowNumber = '';
  if (isSelfSupervisor) {
    // Header is row 1, first persona is row 2
    supervisorRowNumber = String(personas.length + 2);
  } else {
    const supervisorIndex = personas.findIndex((p) => normalize(p.email) === normalize(supervisorEmail));

    if (supervisorIndex === -1) {
      return json({ success: false, error: 'Selected supervisor could not be found.' }, { status: 400 });
    }

    supervisorRowNumber = String(supervisorIndex + 2);
  }

  const row = [
    escapeCsv(name),
    escapeCsv(jobTitle),
    escapeCsv(company),
    escapeCsv(field),
    escapeCsv(phone),
    escapeCsv(email),
    escapeCsv(supervisorRowNumber)
  ].join(',');

  const needsLeadingNewline = !csv.endsWith('\n');
  const nextCsv = `${csv}${needsLeadingNewline ? '\n' : ''}${row}\n`;

  await fs.writeFile(CSV_PATH, nextCsv, 'utf-8');

  return json({
    success: true,
    warning: sameNameExists ? 'A persona with this same name already exists. Save completed.' : null
  });
}