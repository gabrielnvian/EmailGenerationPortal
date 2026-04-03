import type { Persona, Sentiment, Urgency, RelationshipStage, ItemPlan, GroupPlan } from '../types.js';

// ── Domain & Format identifiers ──

export type DomainType = 'email' | 'calendar';
export type FormatId = 'gmail' | 'outlook' | 'gcal';

// ── Wrap context ──

export interface WrapContext {
  groupId: string;
  messageIndex: number;
  groupLength: number;
  senderIndex: number;
  urgency: Urgency;
  recipientName: string;
  recipientEmail: string;
  previousItemIds: string[];
}

// ── Cross-thread context ──

export interface CrossThreadContext {
  otherPersonName: string;
  prevThreadMessages: { senderName: string; body: string }[];
  completedTitles: string[];
}

// ── FormatProvider ──

export interface FormatProvider {
  readonly formatId: FormatId;
  readonly domain: DomainType;

  getSystemPrompt(): string;
  getStopSequences(): string[];

  buildContentPrompt(
    sender: Persona,
    recipient: Persona,
    plan: ItemPlan,
    groupPlan: GroupPlan,
    relationship: string,
    previousMessages?: { senderName: string; body: string }[],
    crossThreadContext?: CrossThreadContext,
  ): string;

  parseAiOutput(
    raw: string,
    sender: Persona,
    recipient: Persona,
    plan: ItemPlan,
    groupPlan: GroupPlan,
    isFirst: boolean,
  ): Record<string, string>;

  wrap(
    canonical: Record<string, string>,
    context: WrapContext,
  ): unknown;
}

// ── DomainAdapter ──

export interface DomainAdapter {
  readonly domain: DomainType;

  getCategoryMap(): Record<RelationshipStage, string[]>;
  getTopicPools(): Record<string, string[]>;

  assignCategory(
    groupIndex: number,
    itemIndex: number,
    stage: RelationshipStage,
  ): string;

  assignTopics(category: string): string[];

  computeBusinessValue(
    category: string,
    urgency: Urgency,
    stage: RelationshipStage,
  ): number;

  generateGroupTitles(
    groupCount: number,
    personas: Persona[],
    relationship: string,
    sentimentTimeline: Sentiment[],
    groupBoundaries: number[],
    itemsPerGroup: number[],
  ): Promise<string[]>;

  generateItemCounts(groupCount: number): number[];
}
