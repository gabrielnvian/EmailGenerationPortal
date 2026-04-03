import http from 'node:http';
import { generateTimeline } from './index.js';
import { saveGeneration, searchGenerations, getGeneration, deleteGeneration } from './db.js';
import { registerProvider, registerDomain, getProvider, getRandomProviderForDomain, getProvidersForDomain, listFormats, listDomains } from './providers/registry.js';
import { EmailDomainAdapter } from './providers/email/domain.js';
import { GmailFormatProvider } from './providers/email/gmail/provider.js';
import { OutlookFormatProvider } from './providers/email/outlook/provider.js';
import { CalendarDomainAdapter } from './providers/calendar/domain.js';
import { GCalFormatProvider } from './providers/calendar/gcal/provider.js';
import type {
  GenerateRequest,
  GenerateResult,
  Persona,
  RouteHandler,
  Route,
} from './types.js';
import type { DomainType, FormatProvider, FormatId } from './providers/types.js';

// ── Register providers ──

registerDomain(new EmailDomainAdapter());
registerDomain(new CalendarDomainAdapter());
registerProvider(new GmailFormatProvider());
registerProvider(new OutlookFormatProvider());
registerProvider(new GCalFormatProvider());

// ── Server setup ──

const PORT = parseInt(process.env.PORT ?? '', 10) || 3005;
const MAX_BODY = 1_000_000; // 1MB
const VALID_DOMAINS = new Set(listDomains());

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk;
      if (data.length > MAX_BODY) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data) as Record<string, unknown>);
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, status: number, obj: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function isPersona(p: unknown): p is Persona {
  if (typeof p !== 'object' || p === null) return false;
  const obj = p as Record<string, unknown>;
  return typeof obj.name === 'string'
    && typeof obj.email === 'string'
    && typeof obj.jobTitle === 'string'
    && typeof obj.company === 'string';
}

// ── Wrapping logic ──

function wrapTimeline(result: GenerateResult, provider: FormatProvider): unknown[] {
  const previousItemIds: string[][] = result.timeline.map(() => []);

  return result.timeline.map((group, gIdx) => {
    const messages = group.messages.map((m, mIdx) => {
      const wrapped = provider.wrap(m.canonical, {
        groupId: group.groupId,
        messageIndex: mIdx,
        groupLength: group.messages.length,
        senderIndex: m.canonical.fromEmail === (result.timeline[0]?.messages[0]?.canonical.fromEmail) ? 0 : 1,
        urgency: m.metadata.urgency,
        recipientName: m.canonical.toName || '',
        recipientEmail: m.canonical.toEmail || '',
        previousItemIds: previousItemIds[gIdx],
      });
      // Track IDs for threading (gmail uses _itemId internally)
      const id = (wrapped as Record<string, unknown>)?.id as string;
      if (id) previousItemIds[gIdx].push(id);
      return wrapped;
    });

    if (provider.domain === 'calendar') {
      // Calendar: flat events
      return messages;
    }
    // Email: threaded
    return { id: group.groupId, messages };
  });
}

// ── Route handlers ──

const handleListFormats: RouteHandler = async (_req, res) => {
  json(res, 200, { success: true, data: listFormats(), domains: listDomains() });
};

const handleListGenerations: RouteHandler = async (_req, res, { query }) => {
  const { rows, total } = searchGenerations({
    query: query.get('q') || undefined,
    persona: query.get('persona') || undefined,
    sentiment: query.get('sentiment') || undefined,
    domain: query.get('domain') || undefined,
    limit: Math.min(parseInt(query.get('limit') ?? '', 10) || 50, 200),
    offset: parseInt(query.get('offset') ?? '', 10) || 0,
  });
  json(res, 200, { success: true, data: rows, total });
};

const handleGetGeneration: RouteHandler = async (_req, res, { params, query }) => {
  const row = getGeneration(params.id!);
  if (!row) return json(res, 404, { success: false, error: 'Not found' });

  const response = JSON.parse(row.response) as GenerateResult;
  const view = query.get('view');
  const domain = response.domain;

  if (view === 'metadata') {
    const groups = response.timeline.map((t) => ({
      id: t.groupId,
      title: t.title,
      messages: t.messages.map((m) => m.metadata),
    }));
    return json(res, 200, { success: true, data: groups });
  }

  // If a specific format is requested, validate it matches the domain
  if (view && view !== 'metadata') {
    let provider: FormatProvider;
    try {
      provider = getProvider(view as FormatId);
    } catch {
      return json(res, 400, { success: false, error: `Unknown format: ${view}. Available: ${listFormats().join(', ')}` });
    }
    if (provider.domain !== domain) {
      const available = getProvidersForDomain(domain).map((p) => p.formatId);
      return json(res, 400, {
        success: false,
        error: `Generation is "${domain}" domain. Use: ${available.join(', ')}`,
      });
    }
    const wrapped = wrapTimeline(response, provider);
    const data = provider.domain === 'calendar' ? wrapped.flat() : wrapped;
    return json(res, 200, { success: true, format: provider.formatId, data });
  }

  // No view specified — full response with random-format wrapping
  const provider = getRandomProviderForDomain(domain);
  const wrapped = wrapTimeline(response, provider);
  const data = provider.domain === 'calendar' ? wrapped.flat() : wrapped;
  json(res, 200, {
    success: true,
    data: {
      ...row,
      request: JSON.parse(row.request) as GenerateRequest,
      response,
      wrapped: { format: provider.formatId, data },
    },
  });
};

const handleDeleteGeneration: RouteHandler = async (_req, res, { params }) => {
  const deleted = deleteGeneration(params.id!);
  if (!deleted) return json(res, 404, { success: false, error: 'Not found' });
  json(res, 200, { success: true });
};

const handleGenerate: RouteHandler = async (req, res) => {
  const body = await parseBody(req);

  if (body.domain !== undefined && !VALID_DOMAINS.has(body.domain as DomainType)) {
    return json(res, 400, {
      success: false,
      error: `Invalid domain "${body.domain}". Available: ${listDomains().join(', ')}`,
    });
  }

  if (!Array.isArray(body.personas) || body.personas.length < 2) {
    return json(res, 400, { success: false, error: 'Need at least 2 personas' });
  }
  for (let i = 0; i < body.personas.length; i++) {
    if (!isPersona(body.personas[i])) {
      return json(res, 400, {
        success: false,
        error: `Persona ${i} missing required fields (name, email, jobTitle, company)`,
      });
    }
  }
  if (typeof body.relationship !== 'string') {
    return json(res, 400, { success: false, error: '"relationship" is required' });
  }

  const request: GenerateRequest = {
    domain: (body.domain as DomainType) || 'email',
    personas: body.personas as Persona[],
    relationship: body.relationship,
    arc: typeof body.arc === 'string' ? body.arc : undefined,
    threadCount: Math.min(Math.max(typeof body.threadCount === 'number' ? body.threadCount : 3, 1), 20),
    timespan: typeof body.timespan === 'string' ? body.timespan : '3 months',
  };

  console.log(`Generating timeline (${request.domain}): ${request.threadCount} groups over ${request.timespan}`);

  const startTime = Date.now();
  const result = await generateTimeline(request);
  const durationMs = Date.now() - startTime;

  const id = saveGeneration({ request, response: result, durationMs });
  console.log(`Saved generation #${id} (${durationMs}ms)`);

  json(res, 200, { success: true, id, data: result });
};

// ── Route table ──

const routes: Route[] = [
  { method: 'GET',    pattern: /^\/formats$/,              handler: handleListFormats },
  { method: 'GET',    pattern: /^\/generations$/,          handler: handleListGenerations },
  { method: 'GET',    pattern: /^\/generations\/(\d+)$/,   handler: handleGetGeneration },
  { method: 'DELETE', pattern: /^\/generations\/(\d+)$/,   handler: handleDeleteGeneration },
  { method: 'POST',   pattern: /^\/generate$/,             handler: handleGenerate },
];

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url ?? '/', 'http://localhost');

  for (const route of routes) {
    if (req.method !== route.method) continue;
    const match = url.pathname.match(route.pattern);
    if (!match) continue;

    const params = match[1] ? { id: parseInt(match[1], 10) } : {};
    try {
      return await route.handler(req, res, { params, query: url.searchParams });
    } catch (err) {
      console.error(err);
      return json(res, 500, { success: false, error: (err as Error).message });
    }
  }

  json(res, 404, { success: false, error: 'Not found' });
});

server.timeout = 0;
server.keepAliveTimeout = 0;

server.listen(PORT, () => {
  console.log(`structured-data-generator listening on :${PORT}`);
  console.log(`Domains: ${listDomains().join(', ')} | Formats: ${listFormats().join(', ')}`);
});
