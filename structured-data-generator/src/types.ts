import type { DomainType } from './providers/types.js';

// ── Persona ──

export interface Persona {
  name: string;
  email: string;
  jobTitle: string;
  company: string;
  field?: string;
  phone?: string;
  tone?: string;
  personality?: string;
  personalDetails?: string[];
  signature?: string;
}

// ── Sentiment system ──

export type Sentiment =
  | 'neutral'
  | 'warm-professional'
  | 'friendly'
  | 'enthusiastic'
  | 'celebratory'
  | 'concerned'
  | 'frustrated'
  | 'cold'
  | 'apologetic'
  | 'grateful';

export type SentimentClass = 'positive' | 'neutral' | 'negative';
export type Urgency = 'low' | 'medium' | 'high';

export type RelationshipStage =
  | 'introduction'
  | 'establishing'
  | 'building'
  | 'collaborating'
  | 'deepening'
  | 'strained'
  | 'repairing'
  | 'mature';

export type ArcSegment =
  | 'professional'
  | 'rapport'
  | 'tense'
  | 'conflict'
  | 'resolve'
  | 'deepen'
  | 'maintain'
  | 'decline'
  | 'urgent';

export type SentimentTrend = 'improving' | 'declining' | 'stable';
export type EngagementLevel = 'high' | 'medium' | 'low';

// ── Plans ──

export interface ItemPlan {
  sender: number;
  date: string;
  sentiment: Sentiment;
  sentimentClass: SentimentClass;
  urgency: Urgency;
  relationshipStage: RelationshipStage;
  category: string;
  businessValue: number;
  topics: string[];
  personalDetailsMentioned: string[];
  toneNotes: string;
  responseTimeMinutes: number | null;
}

export interface GroupPlan {
  title: string;
  messages: ItemPlan[];
}

export interface TimelinePlan {
  arc: string;
  groups: GroupPlan[];
  sentimentTimeline: Sentiment[];
  groupBoundaries: number[];
  itemsPerGroup: number[];
}

// ── Generated output ──

export interface ItemMetadata {
  sentiment: Sentiment;
  sentimentClass: SentimentClass;
  urgency: Urgency;
  relationshipStage: RelationshipStage;
  category: string;
  businessValue: number;
  topics: string[];
  personalDetailsMentioned: string[];
  responseTimeMinutes: number | null;
}

export interface GeneratedItem {
  canonical: Record<string, string>;
  metadata: ItemMetadata;
}

export interface ItemGroup {
  groupId: string;
  title: string;
  messages: GeneratedItem[];
  relationshipScoring?: RelationshipScoring;
}

export interface RelationshipScoring {
  communicationFrequency: number;
  sentimentTrend: SentimentTrend;
  engagementLevel: EngagementLevel;
  daysSinceLastContact: number;
}

export interface TimelineSummary {
  totalMessages: number;
  timespanDays: number;
  sentimentProgression: Sentiment[];
  arcDescription: string;
}

export interface GenerateResult {
  domain: DomainType;
  timeline: ItemGroup[];
  summary: TimelineSummary;
}

// ── Ollama ──

export interface OllamaParams {
  system: string;
  prompt: string;
  context?: number[];
  temperature?: number;
  stop?: string[];
  model?: string;
}

export interface OllamaResponse {
  response: string;
  context: number[];
}

// ── Schema ──

export type SchemaNode =
  | string
  | number
  | boolean
  | null
  | SchemaNode[]
  | { [key: string]: SchemaNode };

// ── API ──

export interface GenerateRequest {
  domain?: DomainType;
  personas: Persona[];
  relationship: string;
  arc?: string;
  threadCount?: number;
  timespan?: string;
  model?: string;
}

// ── Database ──

export interface GenerationRow {
  id: number;
  created_at: string;
  request: string;
  response: string;
  domain: string;
  persona_0_name: string | null;
  persona_0_email: string | null;
  persona_1_name: string | null;
  persona_1_email: string | null;
  relationship: string | null;
  arc: string | null;
  thread_count: number;
  message_count: number;
  timespan_days: number;
  duration_ms: number;
  model: string | null;
}

export interface GenerationListRow {
  id: number;
  created_at: string;
  domain: string;
  persona_0_name: string | null;
  persona_0_email: string | null;
  persona_1_name: string | null;
  persona_1_email: string | null;
  relationship: string | null;
  arc: string | null;
  thread_count: number;
  message_count: number;
  timespan_days: number;
  duration_ms: number;
  model: string | null;
}

export interface SearchParams {
  query?: string;
  persona?: string;
  sentiment?: string;
  domain?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  rows: GenerationListRow[];
  total: number;
}

// ── Server routing ──

export interface RouteParams {
  id?: number;
}

export interface RouteContext {
  params: RouteParams;
  query: URLSearchParams;
}

export type RouteHandler = (
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
  context: RouteContext
) => Promise<void>;

export interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
}
