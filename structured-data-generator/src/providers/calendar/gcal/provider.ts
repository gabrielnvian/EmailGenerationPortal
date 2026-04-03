import type { FormatProvider, WrapContext } from '../../types.js';
import type { Persona, ItemPlan, GroupPlan } from '../../../types.js';
import { gcalSchema } from './schema.js';
import { buildGCalCodeValues } from './generators.js';
import { resolve } from '../../../resolve.js';

const EVENT_SYSTEM_PROMPT = `You generate realistic calendar event details for professional meetings.
Output ONLY a JSON object with exactly these fields: "summary", "description", "location".
- summary: short event title (3-8 words)
- description: 1-2 paragraph meeting description/agenda
- location: physical location or "Google Meet" for virtual
No explanation, no code fences, no additional fields.`;

export class GCalFormatProvider implements FormatProvider {
  readonly formatId = 'gcal' as const;
  readonly domain = 'calendar' as const;

  getSystemPrompt(): string {
    return EVENT_SYSTEM_PROMPT;
  }

  getStopSequences(): string[] {
    return [];
  }

  buildContentPrompt(
    sender: Persona,
    recipient: Persona,
    plan: ItemPlan,
    _groupPlan: GroupPlan,
    relationship: string,
  ): string {
    let prompt = `Calendar event organized by ${sender.name} (${sender.jobTitle}, ${sender.company}).`;
    prompt += `\nAttendee: ${recipient.name} (${recipient.jobTitle}, ${recipient.company}).`;
    prompt += `\nRelationship: ${relationship}`;
    prompt += `\nEvent type: ${plan.category}`;
    prompt += `\nMood/tone: ${plan.sentiment}`;
    prompt += `\nTopics: ${plan.topics.join(', ')}`;

    if (plan.personalDetailsMentioned.length > 0) {
      prompt += `\nContext to weave in: ${plan.personalDetailsMentioned.join(', ')}`;
    }

    prompt += `\n\nGenerate the JSON with summary, description, and location.`;
    return prompt;
  }

  parseAiOutput(
    raw: string,
    sender: Persona,
    _recipient: Persona,
    _plan: ItemPlan,
    groupPlan: GroupPlan,
    _isFirst: boolean,
  ): Record<string, string> {
    let summary = groupPlan.title;
    let description = '';
    let location = 'Google Meet';

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.summary) summary = parsed.summary;
        if (parsed.description) description = parsed.description;
        if (parsed.location) location = parsed.location;
      }
    } catch {
      description = raw.trim();
    }

    return {
      summary,
      description,
      location,
      organizerEmail: sender.email,
      organizerName: sender.name,
      date: _plan.date,
    };
  }

  wrap(canonical: Record<string, string>, context: WrapContext): unknown {
    const aiValues = {
      summary: canonical.summary,
      description: canonical.description,
      location: canonical.location,
      organizerEmail: canonical.organizerEmail,
      organizerName: canonical.organizerName,
    };

    const codeValues = buildGCalCodeValues(aiValues, {
      internalDate: new Date(canonical.date).getTime() || Date.now(),
      recipientEmail: context.recipientEmail,
      recipientName: context.recipientName,
    });

    return resolve(gcalSchema, aiValues, codeValues);
  }
}
