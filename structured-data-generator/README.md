# Structured Data Generator

Generates synthetic Gmail API-compatible email threads for Feather. Given two personas and a relationship description, it produces realistic multi-thread email timelines that match the shape of real Gmail API responses — so Feather's ingestion pipeline can consume them interchangeably with real data.

Each message carries ML-ready metadata (sentiment classes, business value scores, email categories, response timing, relationship scoring) aligned with Feather's model training requirements.

## How it works

Generation happens in two phases:

### Phase 1: Planning (`src/planner.ts`)

The planner builds a deterministic timeline skeleton from the input:

1. **Arc parsing** — The user's narrative arc (e.g. `"professional, builds rapport, billing snag, resolves"`) is matched against keyword-based curve segments. Each segment maps to a sequence of sentiments (e.g. `tense` → `concerned → frustrated → frustrated`). If no arc is given, one is picked randomly.

2. **Sentiment timeline** — The segments are concatenated into a full curve and stretched/compressed to fit the total message count. Each message gets a sentiment, which drives its urgency, relationship stage, sentiment class, email category, business value, and topics.

3. **Dates** — Messages are spread across the requested timespan with realistic jitter: 0.5–2.5 day gaps between threads, 30min–4.5hr gaps between replies within a thread. Dates are pushed to weekday business hours. Monotonic ordering is enforced within threads. Response time deltas are computed for non-first messages.

4. **Subject lines** — Generated one per thread via Ollama, informed by the thread's midpoint sentiment and relationship stage. Previously generated subjects are passed in the prompt to avoid repetition.

5. **Personal details** — Details from persona profiles (birthdays, hobbies, etc.) are sprinkled into later messages with increasing probability, simulating how colleagues learn about each other over time.

The output is a plan: an array of threads, each with a subject and an array of message stubs containing all metadata fields.

### Phase 2: Thread generation (`src/thread-generator.ts`)

Each thread from the plan is generated sequentially. For each message:

1. **AI writes the email body** — Ollama receives a prompt with the sender's identity, tone, personality, relationship context, and the planned sentiment. It uses a rolling context window so replies are coherent with previous messages in the thread. The LLM uses `{{name}}`, `{{title}}`, `{{phone}}`, `{{email}}` placeholders in signatures.

2. **Signature replacement** — Placeholders in the generated body are replaced with actual persona data, ensuring consistent and correctly formatted contact info.

3. **PII sanitization** — Generated bodies are scanned for SSN patterns, credit card numbers, and phone numbers not belonging to the personas. Matches are redacted.

4. **Code computes Gmail fields** (`src/generators.ts`) — Deterministic values that match the Gmail API spec: random hex IDs, shared threadId, base64url-encoded body, RFC 5322 Message-ID headers, size estimates, label arrays, and timestamps.

5. **Template resolution** (`src/resolve.ts`) — A Gmail message schema template (`src/schema.ts`) uses `$ai:` and `$code:` placeholder markers. The resolver walks the template tree and replaces every marker with its actual value, producing a complete Gmail API message object.

6. **Threading headers** — Replies get `In-Reply-To` and `References` headers pointing to previous messages in the thread.

7. **Relationship scoring** — After all messages in a thread are generated, per-thread relationship dimensions are computed: communication frequency, sentiment trend, engagement level, and recency.

Each message is wrapped as `{ gmail, metadata }` — the `gmail` object matches Gmail's `messages.get` response, and `metadata` contains our enrichment fields for ML training.

## File layout

```
src/
  types.ts              All shared interfaces and type aliases
  server.ts             HTTP API server (typed route table, handlers, validation, CORS)
  index.ts              Entry point — orchestrates planning → generation → scoring → summary
  planner.ts            Phase 1: builds timeline skeleton (arc, sentiments, dates, subjects, categories)
  thread-generator.ts   Phase 2: generates email bodies, signature replacement, PII sanitization
  schema.ts             Gmail message template with $ai:/$code: placeholders
  generators.ts         Computes Gmail-spec fields (IDs, base64 body, headers, sizes)
  resolve.ts            Walks schema template, replaces placeholders with values
  ollama.ts             LLM client — streaming API with primary/fallback failover, UTF-8 safe
  db.ts                 SQLite persistence (better-sqlite3, WAL mode, graceful shutdown)
dist/                   Compiled JS output (gitignored)
tsconfig.json           TypeScript config (strict, ES2024, Node16 modules)
example-request.json    Example request for CLI mode
API.md                  Full API reference with request/response examples
```

## Building

```bash
npm install
npm run build      # compiles TypeScript to dist/
npm start          # runs dist/server.js on port 3000
npm run generate   # CLI mode — prints a single generation to stdout
npm run dev        # watches for changes and recompiles
```

## API overview

See [API.md](API.md) for full details.

| Endpoint | Description |
|---|---|
| `POST /generate` | Generate a new timeline from personas + relationship |
| `GET /generations` | List/search past generations (summary rows) |
| `GET /generations/:id` | Full detail for one generation |
| `GET /generations/:id?view=gmail` | Just the Gmail-shaped thread objects |
| `GET /generations/:id?view=metadata` | Just our custom metadata, grouped by thread |
| `DELETE /generations/:id` | Delete a generation |

### View modes

The `?view=` param on `/generations/:id` lets you get just the data you need:

- **`?view=gmail`** — Returns an array of threads shaped like Gmail's `threads.get` response: `[{ id, messages: [gmail, ...] }, ...]`. This is what Feather's pipeline expects.
- **`?view=metadata`** — Returns the same thread structure but with our metadata objects instead of Gmail objects: `[{ id, subject, messages: [metadata, ...] }, ...]`.
- **No view param** — Returns everything: the original request, full response with both gmail and metadata per message, plus summary stats.

## Persona object

```json
{
  "name": "string (required)",
  "email": "string (required)",
  "jobTitle": "string (required)",
  "company": "string (required)",
  "field": "string (optional)",
  "phone": "string (optional)",
  "tone": "string (optional) — writing style",
  "personality": "string (optional) — character description",
  "personalDetails": ["array of mentionable facts"],
  "signature": "string (optional) — exact signature block"
}
```

## Metadata fields

Each generated message carries a `metadata` object with these fields:

### `sentiment`

The emotional tone of the message. Driven by the narrative arc — each arc keyword maps to a curve of sentiments that are spread across the timeline.

| Value | Arc keyword that produces it |
|---|---|
| `cold` | decline, conflict |
| `neutral` | professional (early) |
| `warm-professional` | professional, resolve, maintain |
| `friendly` | rapport, maintain |
| `enthusiastic` | rapport (late), deepen, urgent (late) |
| `concerned` | tense, conflict, urgent |
| `frustrated` | tense, conflict, urgent |
| `apologetic` | resolve |
| `grateful` | resolve (late) |
| `celebratory` | deepen (late) |

### `sentimentClass`

3-class mapping for ML training:

| Class | Sentiments |
|---|---|
| `positive` | warm-professional, friendly, enthusiastic, celebratory, grateful |
| `neutral` | neutral, apologetic |
| `negative` | concerned, frustrated, cold |

### `urgency`

Derived automatically from the sentiment:

| Urgency | Sentiments |
|---|---|
| `low` | neutral, warm-professional, friendly, celebratory, cold, grateful |
| `medium` | enthusiastic, concerned |
| `high` | frustrated, apologetic |

### `relationshipStage`

Also derived from the sentiment:

| Stage | Sentiments |
|---|---|
| `introduction` | neutral |
| `establishing` | warm-professional |
| `building` | friendly |
| `collaborating` | enthusiastic |
| `deepening` | celebratory |
| `strained` | concerned, frustrated, cold |
| `repairing` | apologetic |
| `mature` | grateful |

### `emailCategory`

Business email classification. First message in thread 0 is always `initial-outreach`. Replies have a 60% chance of `follow-up` and 40% chance of a contextual category based on relationship stage. Thread-initiating messages are assigned based on stage:

| Category | Assigned when |
|---|---|
| `initial-outreach` | First message of first thread |
| `follow-up` | Replies (with 60% probability) |
| `meeting-request` | Thread starts during building/collaborating/deepening stages |
| `proposal` | Thread starts during collaborating/deepening stages |
| `service-discussion` | Thread starts during strained/repairing/introduction/establishing stages |
| `renewal-reminder` | Thread starts during mature stage |
| `referral-request` | Thread starts during mature stage |

### `businessValue`

Float 0.0–1.0 representing the business importance of the message. Derived from email category (proposals score high, follow-ups score low), urgency (high urgency adds +0.10), and relationship stage, with small random jitter for realism.

### `topics`

1–2 topics drawn from category-specific pools:

| Category | Topic pool |
|---|---|
| `initial-outreach` | introduction, services overview, requirements gathering, company background |
| `follow-up` | project status, action items, next steps, progress update |
| `meeting-request` | scheduling, agenda planning, availability, meeting logistics |
| `proposal` | pricing, scope of work, deliverables, timeline, budget |
| `service-discussion` | issue resolution, technical support, troubleshooting, specifications |
| `renewal-reminder` | contract renewal, service continuation, pricing review, terms update |
| `referral-request` | referral, recommendation, network introduction |

### `responseTimeMinutes`

Time delta in minutes from the previous message in the thread. `null` for the first message in each thread. Useful for training contact timing prediction models.

### `personalDetailsMentioned`

Personal details from persona profiles that appear in the message. Empty in early messages, increasingly likely after the first 30% of the timeline.

### `labelIds` (on the Gmail object)

Simulates the mailbox from persona 0's perspective:

| Labels | Meaning |
|---|---|
| `["SENT"]` | Persona 0 sent this message |
| `["INBOX", "UNREAD", "IMPORTANT"]` | Recent message from persona 1 (last 2 in thread) |
| `["INBOX", "IMPORTANT"]` | Earlier message from persona 1 (already read) |

## Per-thread relationship scoring

Each thread in the response includes a `relationshipScoring` object with dimensions aligned to Feather's ConnectionIQ model:

| Field | Description |
|---|---|
| `communicationFrequency` | Messages per day within the thread |
| `sentimentTrend` | `improving`, `stable`, or `declining` (compares first vs second half of thread) |
| `engagementLevel` | `low` (2 messages), `medium` (3), `high` (4+) |
| `daysSinceLastContact` | Days from last message in thread to now |

## PII sanitization

Generated email bodies are scanned for common PII patterns before being included in the output:

- **SSN** — `XXX-XX-XXXX` patterns are redacted
- **Credit cards** — 16-digit card number patterns are redacted
- **Phone numbers** — Any phone number not matching one of the persona's assigned phones is redacted

## Infrastructure

- **LLM:** Ollama running `llama3.1:8b` — primary at `red.tail068f9.ts.net:11434`, fallback at `ollama.tail068f9.ts.net:443` (auto-failover with 60s health check)
- **Database:** SQLite via better-sqlite3, stored at `./data/` (bind-mounted in Docker)
- **Deployment:** Docker Compose with source bind-mounted — TypeScript is compiled at container start
- **Access:** Port 3000 internally, proxied via Tailscale Funnel HTTPS on port 8443

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `OLLAMA_URL` | `http://red.tail068f9.ts.net:11434/api/generate` | Primary Ollama endpoint |
| `OLLAMA_FALLBACK_URL` | `https://ollama.tail068f9.ts.net/api/generate` | Fallback Ollama endpoint |
| `MODEL` | `llama3.1:8b` | Ollama model name |
| `DB_PATH` | `./data/generations.db` | SQLite database path |
