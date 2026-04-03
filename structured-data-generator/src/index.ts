import fs from 'node:fs';
import { planTimeline } from './planner.js';
import { generateGroup } from './item-generator.js';
import { getProvidersForDomain, getDomainAdapterByType } from './providers/registry.js';

import type {
  GenerateRequest,
  GenerateResult,
  ItemGroup,
  SentimentClass,
  SentimentTrend,
  EngagementLevel,
} from './types.js';

async function generateTimeline({
  domain = 'email',
  personas,
  relationship,
  arc,
  threadCount = 3,
  timespan = '3 months',
}: GenerateRequest): Promise<GenerateResult> {
  const adapter = getDomainAdapterByType(domain);
  // Use first provider for this domain (prompts are identical within a domain)
  const providers = getProvidersForDomain(domain);
  if (!providers.length) throw new Error(`No providers for domain: ${domain}`);
  const provider = providers[0];

  // Phase 1: Plan the full timeline
  process.stderr.write('\n[1/2] Planning timeline...\n');
  const plan = await planTimeline(personas, arc, threadCount, timespan, adapter);
  process.stderr.write(`  arc: ${plan.arc}\n`);
  process.stderr.write(`  groups: ${plan.groups.length}\n\n`);

  // Phase 2: Generate titles and bodies for each group sequentially
  process.stderr.write('[2/2] Generating groups...\n');
  const timeline: ItemGroup[] = [];
  let prevThreadTail: { senderName: string; body: string }[] = [];
  const completedTitles: string[] = [];

  for (let i = 0; i < plan.groups.length; i++) {
    const groupPlan = plan.groups[i];

    const title = await adapter.generateGroupTitle(
      i,
      plan.groups.length,
      personas,
      relationship,
      plan.sentimentTimeline,
      plan.groupBoundaries,
      plan.itemsPerGroup,
      [...completedTitles],
      prevThreadTail[prevThreadTail.length - 1]?.body,
    );
    groupPlan.title = title;

    process.stderr.write(`  group ${i + 1}/${plan.groups.length}: "${title}"\n`);
    const group = await generateGroup(groupPlan, personas, relationship, provider, prevThreadTail, [...completedTitles]);

    // Per-group relationship scoring dimensions
    const groupDates = groupPlan.messages.map((m) => new Date(m.date));
    const lastDate = groupDates[groupDates.length - 1];
    const groupSpanDays =
      (lastDate.getTime() - groupDates[0].getTime()) / (1000 * 60 * 60 * 24);

    const sentimentValues: Record<SentimentClass, number> = {
      positive: 1,
      neutral: 0,
      negative: -1,
    };
    const classes = groupPlan.messages.map((m) => m.sentimentClass);
    const avg = (arr: SentimentClass[]): number =>
      arr.reduce((sum, s) => sum + (sentimentValues[s] || 0), 0) / arr.length;
    const mid = Math.ceil(classes.length / 2);
    const trend = classes.length > 1 ? avg(classes.slice(mid)) - avg(classes.slice(0, mid)) : 0;

    const sentimentTrend: SentimentTrend =
      trend > 0.3 ? 'improving' : trend < -0.3 ? 'declining' : 'stable';
    const engagementLevel: EngagementLevel =
      groupPlan.messages.length >= 4 ? 'high' : groupPlan.messages.length >= 3 ? 'medium' : 'low';

    group.relationshipScoring = {
      communicationFrequency:
        groupSpanDays > 0
          ? Math.round((groupPlan.messages.length / groupSpanDays) * 100) / 100
          : groupPlan.messages.length,
      sentimentTrend,
      engagementLevel,
      daysSinceLastContact: Math.round(
        (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    };

    prevThreadTail = group.messages
      .map((m) => ({ senderName: (m.canonical as Record<string, string>).fromName, body: (m.canonical as Record<string, string>).body }))
      .slice(-2);
    completedTitles.push(groupPlan.title);

    timeline.push(group);
  }

  // Phase 3: Build summary
  const allMessages = timeline.flatMap((g) => g.messages);
  const firstDate = plan.groups[0]?.messages[0]?.date;
  const lastGroup = plan.groups[plan.groups.length - 1];
  const lastPlanDate = lastGroup?.messages[lastGroup.messages.length - 1]?.date;
  const timespanDays =
    firstDate && lastPlanDate
      ? Math.round(
          (new Date(lastPlanDate).getTime() - new Date(firstDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  return {
    domain,
    timeline,
    summary: {
      totalMessages: allMessages.length,
      timespanDays,
      sentimentProgression: allMessages.map((m) => m.metadata.sentiment),
      arcDescription: plan.arc,
    },
  };
}

// CLI usage: node dist/index.js [path-to-request.json]
if (import.meta.url === `file://${process.argv[1]}`) {
  const inputPath = process.argv[2] || new URL('../example-request.json', import.meta.url).pathname;
  const request: GenerateRequest = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  generateTimeline(request)
    .then((result) => console.log(JSON.stringify({ success: true, data: result }, null, 2)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { generateTimeline };
