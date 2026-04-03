import { generate } from './ollama.js';
import type { FormatProvider } from './providers/types.js';
import type { Persona, GroupPlan, ItemGroup, GeneratedItem } from './types.js';

interface PiiPattern {
  pattern: RegExp;
  replacement: string;
}

const PII_PATTERNS: PiiPattern[] = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
  { pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g, replacement: '[CC REDACTED]' },
];

function sanitizePII(text: string, allowedPhones: string[]): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  const normalized = allowedPhones.map((p) => p.replace(/[-. ]/g, ''));
  result = result.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, (match) => {
    if (normalized.includes(match.replace(/[-. ]/g, ''))) return match;
    return '[PHONE REDACTED]';
  });
  return result;
}

function normalizeUnicode(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '--')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
}

function randomHex(len: number): string {
  const chars = '0123456789abcdef';
  let r = '';
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * 16)];
  return r;
}

async function generateGroup(
  groupPlan: GroupPlan,
  personas: Persona[],
  relationship: string,
  provider: FormatProvider,
): Promise<ItemGroup> {
  const groupId = randomHex(16);
  const messages: GeneratedItem[] = [];
  let context: number[] = [];

  for (let i = 0; i < groupPlan.messages.length; i++) {
    const plan = groupPlan.messages[i];
    const sender = personas[plan.sender];
    const recipient = personas[1 - plan.sender];

    process.stderr.write(`    message ${i + 1}/${groupPlan.messages.length} (${sender.name})...`);

    const prompt = provider.buildContentPrompt(sender, recipient, plan, groupPlan, relationship);

    const stopSequences = provider.getStopSequences();
    const result = await generate({
      system: provider.getSystemPrompt(),
      prompt,
      context,
      temperature: 0.9,
      ...(stopSequences.length ? { stop: stopSequences } : {}),
    });

    context = result.context;

    const allowedPhones = personas.map((p) => p.phone).filter(Boolean) as string[];
    const sanitized = normalizeUnicode(sanitizePII(result.response, allowedPhones));

    process.stderr.write(` ${plan.sentiment}\n`);

    const canonical = provider.parseAiOutput(sanitized, sender, recipient, plan, groupPlan, i === 0);

    messages.push({
      canonical,
      metadata: {
        sentiment: plan.sentiment,
        sentimentClass: plan.sentimentClass,
        urgency: plan.urgency,
        relationshipStage: plan.relationshipStage,
        category: plan.category,
        businessValue: plan.businessValue,
        topics: plan.topics,
        personalDetailsMentioned: plan.personalDetailsMentioned,
        responseTimeMinutes: plan.responseTimeMinutes,
      },
    });
  }

  return { groupId, title: groupPlan.title, messages };
}

export { generateGroup };
