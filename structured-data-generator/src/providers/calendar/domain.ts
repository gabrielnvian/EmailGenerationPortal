import { generate } from '../../ollama.js';
import type { DomainAdapter } from '../types.js';
import type { Persona, Sentiment, Urgency, RelationshipStage } from '../../types.js';
import { STAGE_MAP } from '../../planner.js';

const CATEGORY_MAP: Record<RelationshipStage, string[]> = {
  'introduction': ['kickoff', 'one-on-one'],
  'establishing': ['one-on-one', 'status-review'],
  'building': ['planning-meeting', 'status-review'],
  'collaborating': ['planning-meeting', 'workshop'],
  'deepening': ['workshop', 'social'],
  'strained': ['status-review', 'one-on-one'],
  'repairing': ['one-on-one'],
  'mature': ['social', 'status-review', 'planning-meeting'],
};

const TOPIC_POOLS: Record<string, string[]> = {
  'planning-meeting': ['quarterly planning', 'roadmap review', 'resource allocation', 'milestone check', 'sprint planning'],
  'status-review': ['project update', 'metrics review', 'blockers discussion', 'deliverable check-in', 'progress report'],
  'kickoff': ['project kickoff', 'introductions', 'scope alignment', 'timeline review', 'stakeholder onboarding'],
  'one-on-one': ['career development', 'feedback session', 'goal setting', 'check-in', 'mentoring'],
  'deadline-reminder': ['submission deadline', 'review deadline', 'contract deadline', 'milestone due date'],
  'workshop': ['brainstorming', 'design sprint', 'training session', 'deep dive', 'technical review'],
  'social': ['team lunch', 'happy hour', 'celebration', 'offsite planning', 'team building'],
};

const CATEGORY_BASE_VALUE: Record<string, number> = {
  'planning-meeting': 0.80, 'workshop': 0.75, 'kickoff': 0.70,
  'status-review': 0.65, 'deadline-reminder': 0.60, 'one-on-one': 0.55,
  'social': 0.30,
};

const URGENCY_BOOST: Record<Urgency, number> = { high: 0.10, medium: 0.05, low: 0 };

const STAGE_BOOST: Partial<Record<RelationshipStage, number>> = {
  'collaborating': 0.05, 'deepening': 0.05, 'mature': 0.05,
  'strained': -0.05, 'introduction': -0.05,
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class CalendarDomainAdapter implements DomainAdapter {
  readonly domain = 'calendar' as const;

  getCategoryMap(): Record<RelationshipStage, string[]> {
    return CATEGORY_MAP;
  }

  getTopicPools(): Record<string, string[]> {
    return TOPIC_POOLS;
  }

  assignCategory(groupIndex: number, _itemIndex: number, stage: RelationshipStage): string {
    if (groupIndex === 0) return 'kickoff';
    const candidates = CATEGORY_MAP[stage] || ['one-on-one'];
    return pickRandom(candidates);
  }

  assignTopics(category: string): string[] {
    const pool = TOPIC_POOLS[category] || TOPIC_POOLS['status-review'];
    const count = 1 + Math.floor(Math.random() * 2);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  computeBusinessValue(category: string, urgency: Urgency, stage: RelationshipStage): number {
    let value = (CATEGORY_BASE_VALUE[category] || 0.50)
      + (URGENCY_BOOST[urgency] || 0)
      + (STAGE_BOOST[stage] || 0)
      + (Math.random() - 0.5) * 0.10;
    return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
  }

  generateItemCounts(groupCount: number): number[] {
    // Calendar events are individual — one event per group
    return Array(groupCount).fill(1);
  }

  async generateGroupTitle(
    groupIndex: number,
    groupCount: number,
    personas: Persona[],
    relationship: string,
    sentimentTimeline: Sentiment[],
    groupBoundaries: number[],
    _itemsPerGroup: number[],
    completedTitles?: string[],
    _lastMessageBody?: string,
  ): Promise<string> {
    const startIdx = groupBoundaries[groupIndex];
    const sentiment = sentimentTimeline[startIdx] || 'neutral';
    const stage = STAGE_MAP[sentiment] || 'establishing';

    process.stderr.write(`  event title ${groupIndex + 1}/${groupCount}...`);

    let prompt = `${personas[0].name} (${personas[0].jobTitle}, ${personas[0].company}) and ${personas[1].name} (${personas[1].jobTitle}, ${personas[1].company}).
Relationship: ${relationship}. Stage: ${stage}. Mood: ${sentiment}.
Generate a calendar event title for event ${groupIndex + 1} of ${groupCount}.`;

    if (completedTitles && completedTitles.length > 0) {
      prompt += `\nPrevious events were: ${completedTitles.map((s, i) => `${i + 1}. "${s}"`).join(', ')}. Do NOT repeat — pick a different type of meeting or angle.`;
    }

    const { response } = await generate({
      system: 'Generate a realistic calendar event title for a business meeting. Output ONLY the title. No quotes, no prefix, no explanation. Keep it short (3-8 words).',
      prompt,
      temperature: 1.0,
    });

    const title = response.replace(/^["']|["']$/g, '').trim();
    process.stderr.write(` "${title}"\n`);
    return title;
  }
}
