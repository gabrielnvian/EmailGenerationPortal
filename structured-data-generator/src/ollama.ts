import http from 'node:http';
import https from 'node:https';
import { StringDecoder } from 'node:string_decoder';

import type { OllamaParams, OllamaResponse } from './types.js';

interface OllamaChunk {
  response?: string;
  done?: boolean;
  context?: number[];
}

const PRIMARY_URL = process.env.OLLAMA_URL || 'http://red.tail068f9.ts.net:11434/api/generate';
const FALLBACK_URL = process.env.OLLAMA_FALLBACK_URL || 'https://ollama.tail068f9.ts.net/api/generate';
const MODEL = process.env.DEFAULT_MODEL || 'qwen3:8b';
const RETRY_DELAY = 2_000;
const HEALTH_CHECK_INTERVAL = 60_000;

let activeUrl = PRIMARY_URL;
let lastHealthCheck = 0;

function healthCheck(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parsed = new URL(url.replace('/api/generate', '/api/tags'));
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname,
        method: 'GET',
        timeout: 3000,
      },
      (res) => {
        res.resume();
        resolve((res.statusCode ?? 0) < 400);
      }
    );
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function resolveUrl(): Promise<string> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) return activeUrl;
  lastHealthCheck = now;

  if (await healthCheck(PRIMARY_URL)) {
    if (activeUrl !== PRIMARY_URL) process.stderr.write(`  [ollama] switching to primary: ${PRIMARY_URL}\n`);
    activeUrl = PRIMARY_URL;
  } else {
    if (activeUrl !== FALLBACK_URL) process.stderr.write(`  [ollama] primary down, falling back to: ${FALLBACK_URL}\n`);
    activeUrl = FALLBACK_URL;
  }
  return activeUrl;
}

class OllamaError extends Error {
  status?: number;
  body?: string;

  constructor(message: string, { status, body }: { status?: number; body?: string } = {}) {
    super(message);
    this.name = 'OllamaError';
    this.status = status;
    this.body = body;
  }
}

function streamGenerate(params: OllamaParams, url: string): Promise<OllamaResponse> {
  const { system, prompt, context = [], temperature = 0.9, stop, model } = params;

  return new Promise<OllamaResponse>((resolve, reject) => {
    const payload = JSON.stringify({
      model: model || MODEL,
      system,
      prompt,
      context,
      stream: true,
      options: { temperature, num_ctx: 8192, ...(stop ? { stop } : {}) },
    });

    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          let body = '';
          res.on('data', (c: Buffer) => (body += c));
          res.on('end', () =>
            reject(new OllamaError(`Ollama returned ${res.statusCode}`, { status: res.statusCode, body }))
          );
          return;
        }

        let response = '';
        let finalContext: number[] = [];
        let buffer = '';
        const decoder = new StringDecoder('utf8');
        res.on('data', (chunk: Buffer) => {
          buffer += decoder.write(chunk);
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj: OllamaChunk = JSON.parse(line);
              if (obj.response) response += obj.response;
              if (obj.done && obj.context) finalContext = obj.context;
            } catch {
              // skip malformed chunks
            }
          }
        });

        res.on('end', () => {
          buffer += decoder.end();
          if (buffer.trim()) {
            try {
              const obj: OllamaChunk = JSON.parse(buffer);
              if (obj.response) response += obj.response;
              if (obj.done && obj.context) finalContext = obj.context;
            } catch { /* ignore */ }
          }

          if (!response) {
            return reject(new OllamaError('Ollama returned empty response'));
          }
          resolve({ response: response.trim(), context: finalContext });
        });

        res.on('error', (err: Error) => reject(new OllamaError(`Stream error: ${err.message}`)));
      }
    );

    req.on('error', (err: Error) => reject(new OllamaError(`Network error: ${err.message}`)));
    req.write(payload);
    req.end();
  });
}

async function generate(params: OllamaParams): Promise<OllamaResponse> {
  const url = await resolveUrl();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await streamGenerate(params, url);
    } catch (err) {
      const message = (err as Error).message;
      const retriable = message.includes('timed out') || message.includes('Network') || message.includes('ECONNR');
      if (attempt === 0 && retriable) {
        if (url === PRIMARY_URL) {
          process.stderr.write(`  [ollama] primary failed, trying fallback...\n`);
          activeUrl = FALLBACK_URL;
          lastHealthCheck = Date.now();
          return await streamGenerate(params, FALLBACK_URL);
        }
        process.stderr.write(`  [retry after ${RETRY_DELAY}ms: ${message}]\n`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        continue;
      }
      throw err;
    }
  }

  // Unreachable — the loop always returns or throws — but satisfies the compiler.
  throw new OllamaError('Exhausted retries');
}

export { generate };
