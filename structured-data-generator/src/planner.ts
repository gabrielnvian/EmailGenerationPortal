import type { DomainAdapter } from './providers/types.js';

import type {
  Persona,
  Sentiment,
  SentimentClass,
  Urgency,
  RelationshipStage,
  ArcSegment,
  ItemPlan,
  GroupPlan,
  TimelinePlan,
} from './types.js';

const CURVES: Record<ArcSegment, Sentiment[]> = {
  professional: ['neutral', 'warm-professional', 'warm-professional'],
  rapport: ['warm-professional', 'friendly', 'friendly', 'enthusiastic'],
  tense: ['concerned', 'frustrated', 'frustrated'],
  conflict: ['concerned', 'frustrated', 'cold'],
  resolve: ['apologetic', 'warm-professional', 'grateful'],
  deepen: ['friendly', 'enthusiastic', 'celebratory'],
  maintain: ['friendly', 'warm-professional', 'friendly'],
  decline: ['warm-professional', 'neutral', 'cold'],
  urgent: ['concerned', 'frustrated', 'enthusiastic'],
};

const DEFAULT_ARCS: ArcSegment[][] = [
  ['professional', 'rapport', 'deepen'],
  ['professional', 'rapport', 'tense', 'resolve'],
  ['professional', 'rapport', 'maintain'],
  ['professional', 'tense', 'resolve', 'deepen'],
];

export const STAGE_MAP: Record<Sentiment, RelationshipStage> = {
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

const URGENCY_MAP: Record<Sentiment, Urgency> = {
  'neutral': 'low',
  'warm-professional': 'low',
  'friendly': 'low',
  'enthusiastic': 'medium',
  'celebratory': 'low',
  'concerned': 'medium',
  'frustrated': 'high',
  'cold': 'low',
  'apologetic': 'high',
  'grateful': 'low',
};

const SENTIMENT_CLASS_MAP: Record<Sentiment, SentimentClass> = {
  'neutral': 'neutral',
  'warm-professional': 'positive',
  'friendly': 'positive',
  'enthusiastic': 'positive',
  'celebratory': 'positive',
  'concerned': 'negative',
  'frustrated': 'negative',
  'cold': 'negative',
  'apologetic': 'neutral',
  'grateful': 'positive',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function parseArc(arcString: string | undefined): ArcSegment[] {
  if (!arcString) return pickRandom(DEFAULT_ARCS);

  const phrases = arcString.toLowerCase().split(/[,;]|\bthen\b|\band\b/).map((s) => s.trim()).filter(Boolean);

  const synonyms: Record<ArcSegment, string[]> = {
    professional: ['professional', 'formal', 'starts'],
    rapport: ['rapport', 'friendly', 'warm', 'bond', 'closer', 'builds'],
    tense: ['tense', 'dispute', 'billing', 'problem', 'snag', 'conflict', 'issue', 'difficult'],
    conflict: ['conflict'],
    resolve: ['resolve', 'fix', 'amicab', 'recover', 'repair', 'smooth'],
    deepen: ['deepen', 'strengthen', 'grow', 'celebrat'],
    maintain: ['maintain', 'steady', 'stable', 'routine'],
    decline: ['decline', 'fade', 'distant', 'cold'],
    urgent: ['urgent', 'crisis', 'emergency'],
  };

  const segments: ArcSegment[] = [];
  for (const phrase of phrases) {
    let matched = false;
    for (const [segment, keywords] of Object.entries(synonyms) as [ArcSegment, string[]][]) {
      if (keywords.some((kw) => phrase.includes(kw))) {
        if (!segments.length || segments[segments.length - 1] !== segment) {
          segments.push(segment);
        }
        matched = true;
        break;
      }
    }
    if (!matched && segments.length === 0) segments.push('professional');
  }

  return segments.length > 0 ? segments : pickRandom(DEFAULT_ARCS);
}

export function buildSentimentTimeline(arcSegments: ArcSegment[], totalMessages: number): Sentiment[] {
  let fullCurve: Sentiment[] = [];
  for (const seg of arcSegments) {
    fullCurve = fullCurve.concat(CURVES[seg] || ['warm-professional']);
  }

  const timeline: Sentiment[] = [];
  for (let i = 0; i < totalMessages; i++) {
    const idx = Math.floor((i / totalMessages) * fullCurve.length);
    timeline.push(fullCurve[Math.min(idx, fullCurve.length - 1)]);
  }
  return timeline;
}

function parseTimespan(timespan: string): number {
  const match = timespan.match(/(\d+)\s*(day|week|month|year)/i);
  if (!match) return 90;
  const n = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('day')) return n;
  if (unit.startsWith('week')) return n * 7;
  if (unit.startsWith('month')) return n * 30;
  if (unit.startsWith('year')) return n * 365;
  return 90;
}

function generateDates(totalMessages: number, groupBoundaries: number[], timespanDays: number): string[] {
  const startMs = Date.now() - timespanDays * 24 * 60 * 60 * 1000;
  const dates: string[] = [];

  for (let i = 0; i < totalMessages; i++) {
    const progress = i / Math.max(totalMessages - 1, 1);
    let timestamp = startMs + progress * timespanDays * 24 * 60 * 60 * 1000;

    const isGroupStart = groupBoundaries.includes(i);
    if (isGroupStart && i > 0) {
      timestamp += (Math.random() * 2 + 0.5) * 24 * 60 * 60 * 1000;
    } else if (i > 0) {
      timestamp += (Math.random() * 4 + 0.5) * 60 * 60 * 1000;
    }

    const d = new Date(timestamp);
    const day = d.getUTCDay();
    if (day === 0) d.setUTCDate(d.getUTCDate() + 1);
    if (day === 6) d.setUTCDate(d.getUTCDate() + 2);
    d.setUTCHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);

    dates.push(d.toISOString());
  }

  // Enforce monotonic ordering within each group
  for (let b = 0; b < groupBoundaries.length; b++) {
    const groupStart = groupBoundaries[b];
    const end = b + 1 < groupBoundaries.length ? groupBoundaries[b + 1] : totalMessages;
    for (let j = groupStart + 1; j < end; j++) {
      if (dates[j] <= dates[j - 1]) {
        const prev = new Date(dates[j - 1]);
        prev.setMinutes(prev.getMinutes() + 30 + Math.floor(Math.random() * 60));
        dates[j] = prev.toISOString();
      }
    }
  }

  return dates;
}

function pickPersonalDetails(messageIndex: number, totalMessages: number, senderPersona: Persona, recipientPersona: Persona): string[] {
  const progress = messageIndex / totalMessages;
  if (progress < 0.3) return [];

  const chance = (progress - 0.3) * 1.4;
  const details: string[] = [];

  const allDetails = [
    ...(recipientPersona.personalDetails || []),
    ...(senderPersona.personalDetails || []),
  ];

  for (const detail of allDetails) {
    if (Math.random() < chance * 0.4) details.push(detail);
  }

  return details.slice(0, 2);
}

async function planTimeline(
  personas: Persona[],
  arc: string | undefined,
  groupCount: number,
  timespan: string,
  adapter: DomainAdapter,
): Promise<TimelinePlan> {
  const arcSegments = parseArc(arc);
  const timespanDays = parseTimespan(timespan);

  const itemsPerGroup = adapter.generateItemCounts(groupCount);
  const totalItems = itemsPerGroup.reduce((a, b) => a + b, 0);

  const sentimentTimeline = buildSentimentTimeline(arcSegments, totalItems);

  const groupBoundaries: number[] = [];
  let cursor = 0;
  for (const count of itemsPerGroup) {
    groupBoundaries.push(cursor);
    cursor += count;
  }

  const dates = generateDates(totalItems, groupBoundaries, timespanDays);

  const arcDescription = arcSegments.join(' → ');
  const groups: GroupPlan[] = [];
  let msgIdx = 0;

  for (let g = 0; g < groupCount; g++) {
    const count = itemsPerGroup[g];
    const messages: ItemPlan[] = [];

    const initiator = g % 2 === 0 ? 0 : 1;

    for (let m = 0; m < count; m++) {
      const actualSender = m % 2 === 0 ? initiator : 1 - initiator;

      const sentiment = sentimentTimeline[msgIdx] || 'warm-professional' as Sentiment;
      const urgency = (URGENCY_MAP[sentiment] || 'low') as Urgency;
      const relationshipStage = (STAGE_MAP[sentiment] || 'establishing') as RelationshipStage;
      const category = adapter.assignCategory(g, m, relationshipStage);
      const senderPersona = personas[actualSender];
      const recipientPersona = personas[1 - actualSender];

      messages.push({
        sender: actualSender,
        date: dates[msgIdx],
        sentiment,
        sentimentClass: (SENTIMENT_CLASS_MAP[sentiment] || 'neutral') as SentimentClass,
        urgency,
        relationshipStage,
        category,
        businessValue: adapter.computeBusinessValue(category, urgency, relationshipStage),
        topics: adapter.assignTopics(category),
        personalDetailsMentioned: pickPersonalDetails(msgIdx, totalItems, senderPersona, recipientPersona),
        toneNotes: `${sentiment}, ${senderPersona.tone || 'professional'}`,
        responseTimeMinutes: m > 0
          ? Math.round((new Date(dates[msgIdx]).getTime() - new Date(dates[msgIdx - 1]).getTime()) / (1000 * 60))
          : null,
      });
      msgIdx++;
    }

    groups.push({ title: '', messages });
  }

  return { arc: arcDescription, groups, sentimentTimeline, groupBoundaries, itemsPerGroup };
}

export { planTimeline };
