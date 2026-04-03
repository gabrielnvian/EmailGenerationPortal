import { generate } from '../../ollama.js';
import type { DomainAdapter } from '../types.js';
import type { Persona, Sentiment, Urgency, RelationshipStage } from '../../types.js';

const STAGE_MAP: Record<Sentiment, RelationshipStage> = {
  'neutral': 'introduction',
  'warm-professional': 'establishing',
  'friendly': 'building',
  'enthusiastic': 'collaborating',
  'celebratory': 'deepening',
  'concerned': 'strained',
  'frustrated': 'strained',
  'cold': 'strained',
  'apologetic': 'repairing',
  'grateful': 'mature',
};

const CATEGORY_MAP: Record<RelationshipStage, string[]> = {
  'introduction': ['initial-outreach', 'service-discussion'],
  'establishing': ['follow-up', 'service-discussion'],
  'building': ['meeting-request', 'service-discussion', 'follow-up'],
  'collaborating': ['meeting-request', 'proposal'],
  'deepening': ['proposal', 'meeting-request'],
  'strained': ['service-discussion'],
  'repairing': ['service-discussion', 'follow-up'],
  'mature': ['renewal-reminder', 'referral-request', 'follow-up'],
};

const TOPIC_POOLS: Record<string, string[]> = {
  'initial-outreach': ['introduction', 'services overview', 'requirements gathering', 'company background'],
  'follow-up': ['project status', 'action items', 'next steps', 'progress update'],
  'meeting-request': ['scheduling', 'agenda planning', 'availability', 'meeting logistics'],
  'proposal': ['pricing', 'scope of work', 'deliverables', 'timeline', 'budget'],
  'renewal-reminder': ['contract renewal', 'service continuation', 'pricing review', 'terms update'],
  'service-discussion': ['issue resolution', 'technical support', 'troubleshooting', 'specifications'],
  'referral-request': ['referral', 'recommendation', 'network introduction'],
};

const CATEGORY_BASE_VALUE: Record<string, number> = {
  'proposal': 0.85, 'renewal-reminder': 0.75, 'meeting-request': 0.65,
  'referral-request': 0.70, 'initial-outreach': 0.50, 'service-discussion': 0.55,
  'follow-up': 0.30,
};

const URGENCY_BOOST: Record<Urgency, number> = { high: 0.10, medium: 0.05, low: 0 };

const STAGE_BOOST: Partial<Record<RelationshipStage, number>> = {
  'collaborating': 0.05, 'deepening': 0.05, 'mature': 0.05,
  'strained': -0.05, 'introduction': -0.05,
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class EmailDomainAdapter implements DomainAdapter {
  readonly domain = 'email' as const;

  getCategoryMap(): Record<RelationshipStage, string[]> {
    return CATEGORY_MAP;
  }

  getTopicPools(): Record<string, string[]> {
    return TOPIC_POOLS;
  }

  assignCategory(groupIndex: number, itemIndex: number, stage: RelationshipStage): string {
    if (groupIndex === 0 && itemIndex === 0) return 'initial-outreach';

    if (itemIndex === 0) {
      const candidates = CATEGORY_MAP[stage] || ['follow-up'];
      return pickRandom(candidates);
    }

    if (Math.random() < 0.6) return 'follow-up';
    const replyCategories: Partial<Record<RelationshipStage, string[]>> = {
      'building': ['meeting-request'],
      'collaborating': ['meeting-request', 'proposal'],
      'deepening': ['proposal', 'meeting-request'],
      'strained': ['service-discussion'],
      'repairing': ['service-discussion'],
      'mature': ['renewal-reminder'],
    };
    const candidates = replyCategories[stage];
    return candidates ? pickRandom(candidates) : 'follow-up';
  }

  assignTopics(category: string): string[] {
    const pool = TOPIC_POOLS[category] || TOPIC_POOLS['follow-up'];
    const count = 1 + Math.floor(Math.random() * 2);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  computeBusinessValue(category: string, urgency: Urgency, stage: RelationshipStage): number {
    let value = (CATEGORY_BASE_VALUE[category] || 0.30)
      + (URGENCY_BOOST[urgency] || 0)
      + (STAGE_BOOST[stage] || 0)
      + (Math.random() - 0.5) * 0.10;
    return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
  }

  generateItemCounts(groupCount: number): number[] {
    const counts: number[] = [];
    for (let t = 0; t < groupCount; t++) {
      counts.push(2 + Math.floor(Math.random() * 3));
    }
    return counts;
  }

  async generateGroupTitle(
    groupIndex: number,
    groupCount: number,
    personas: Persona[],
    relationship: string,
    sentimentTimeline: Sentiment[],
    groupBoundaries: number[],
    itemsPerGroup: number[],
    completedTitles?: string[],
    lastMessageBody?: string,
    model?: string,
  ): Promise<string> {
    const startIdx = groupBoundaries[groupIndex];
    const endIdx = startIdx + itemsPerGroup[groupIndex];
    const threadSentiments = sentimentTimeline.slice(startIdx, endIdx);
    const sentiment = threadSentiments[Math.floor(threadSentiments.length / 2)];
    const stage = STAGE_MAP[sentiment] || 'establishing';

    process.stderr.write(`  subject ${groupIndex + 1}/${groupCount}...`);

    let prompt = `${personas[0].name} (${personas[0].jobTitle}, ${personas[0].company}) and ${personas[1].name} (${personas[1].jobTitle}, ${personas[1].company}).
Relationship: ${relationship}. Stage: ${stage}. Mood: ${sentiment}.
Generate a subject line for thread ${groupIndex + 1} of ${groupCount}.`;

    if (completedTitles && completedTitles.length > 0) {
      prompt += `\nPrevious threads were: ${completedTitles.map((s, i) => `${i + 1}. "${s}"`).join(', ')}. Do NOT repeat or rephrase these — pick a different topic or angle.`;
    }

    if (lastMessageBody) {
      prompt += `\nThe previous thread ended with:\n"${lastMessageBody}"`;
      prompt += `\nThe new subject should naturally continue from or acknowledge that context.`;
    }

    const { response } = await generate({
      system: 'Generate a realistic business email subject line. Output ONLY the subject line. No quotes, no prefix, no explanation.',
      prompt,
      temperature: 1.0,
      ...(model ? { model } : {}),
    });

    const subject = response.replace(/^["']|["']$/g, '').replace(/^(Subject:\s*)/i, '');
    process.stderr.write(` "${subject}"\n`);
    return subject;
  }
}
