<script lang="ts">
	import {decodeEmailBody, getHeader, formatResponseTime, type GenerateData, type GmailMessage} from "./generate/generate";

	export let data: GenerateData;

	function isSentByOwner(gmail: GmailMessage): boolean {
		return gmail.labelIds?.includes('SENT') ?? false;
	}

	function isUnread(gmail: GmailMessage): boolean {
		return gmail.labelIds?.includes('UNREAD') ?? false;
	}

	const SENTIMENT_CLASS_COLORS: Record<string, { bg: string; color: string }> = {
		positive: { bg: 'rgba(0,249,207,0.12)', color: '#00f9cf' },
		neutral:  { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' },
		negative: { bg: 'rgba(255,107,107,0.12)', color: '#ff8080' },
	};

	const TREND_ARROWS: Record<string, string> = {
		improving: '↗',
		stable: '→',
		declining: '↘',
	};

	// Compute distributions across all messages for the summary
	$: allMessages = data.timeline.flatMap(t => t.messages);

	$: sentimentClassDist = allMessages.reduce((acc, m) => {
		const cls = m.metadata.sentimentClass ?? 'neutral';
		acc[cls] = (acc[cls] ?? 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	$: categoryDist = allMessages.reduce((acc, m) => {
		const cat = m.metadata.emailCategory;
		if (cat) acc[cat] = (acc[cat] ?? 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	$: hasSentimentClasses = Object.keys(sentimentClassDist).length > 0 && allMessages.some(m => m.metadata.sentimentClass);
	$: hasCategories = Object.keys(categoryDist).length > 0;
</script>

<!-- Summary -->
{#if data.summary.arcDescription || data.summary.totalMessages}
	<div class="surface p-5 flex flex-col gap-3">
		<div class="section-label section-label--purple">Summary</div>
		{#if data.summary.arcDescription}
			<p class="text-sm text-white/80">{data.summary.arcDescription}</p>
		{/if}
		<div class="flex flex-wrap gap-4 text-xs text-white/50">
			<span>{data.summary.totalMessages} messages</span>
			<span>{data.summary.timespanDays} days</span>
		</div>
		{#if data.summary.sentimentProgression.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each data.summary.sentimentProgression as sentiment, i}
					<span class="badge-cyan">{sentiment}</span>
					{#if i < data.summary.sentimentProgression.length - 1}
						<span class="text-white/25 text-xs self-center">→</span>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Sentiment class distribution -->
		{#if hasSentimentClasses}
			<div class="flex items-center gap-3 text-xs">
				<span class="text-white/40">Sentiment:</span>
				{#each ['positive', 'neutral', 'negative'] as cls}
					{#if sentimentClassDist[cls]}
						{@const c = SENTIMENT_CLASS_COLORS[cls]}
						<span class="flex items-center gap-1">
							<span class="w-2 h-2 rounded-full" style="background:{c.color};"></span>
							<span style="color:{c.color};">{sentimentClassDist[cls]} {cls}</span>
						</span>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Email category distribution -->
		{#if hasCategories}
			<div class="flex flex-wrap gap-1.5">
				{#each Object.entries(categoryDist).sort((a, b) => b[1] - a[1]) as [cat, count]}
					<span class="badge-blue">{cat} ({count})</span>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<!-- Timeline -->
{#each data.timeline as thread, ti}
	{@const scoring = thread.relationshipScoring}
	<div class="surface p-5 flex flex-col gap-3">
		<!-- Thread header -->
		<div class="flex items-center gap-2 flex-wrap">
			<div class="section-label section-label--cyan">Thread {ti + 1}</div>
			<span class="text-sm text-white/60 ml-1 truncate">{thread.subject}</span>
			<span class="text-xs text-white/40 ml-auto flex-shrink-0">{thread.messages.length} msg{thread.messages.length === 1 ? '' : 's'}</span>
		</div>

		<!-- Relationship scoring -->
		{#if scoring}
			<div class="flex flex-wrap gap-3 text-xs text-white/50">
				<span>{scoring.communicationFrequency.toFixed(2)} msgs/day</span>
				<span>
					{TREND_ARROWS[scoring.sentimentTrend] ?? '→'} {scoring.sentimentTrend}
				</span>
				<span class="px-1.5 py-0.5 rounded text-[10px] font-medium"
					style="background:{scoring.engagementLevel === 'high' ? '#00f9cf14' : scoring.engagementLevel === 'medium' ? '#29b0ff14' : '#ffffff08'}; color:{scoring.engagementLevel === 'high' ? '#00f9cf' : scoring.engagementLevel === 'medium' ? '#5cc4ff' : 'rgba(255,255,255,0.45)'};">
					{scoring.engagementLevel} engagement
				</span>
				<span>{scoring.daysSinceLastContact}d since last contact</span>
			</div>
		{/if}

		<!-- Messages -->
		<div class="flex flex-col gap-2">
			{#each thread.messages as msg, mi}
				{@const from = getHeader(msg.gmail, 'From')}
				{@const to = getHeader(msg.gmail, 'To')}
				{@const date = getHeader(msg.gmail, 'Date')}
				{@const sent = isSentByOwner(msg.gmail)}
				{@const unread = !sent && isUnread(msg.gmail)}
				{@const scColors = SENTIMENT_CLASS_COLORS[msg.metadata.sentimentClass ?? ''] ?? null}
				<details class="surface-inset overflow-hidden">
					<summary class="px-4 py-3 cursor-pointer text-sm hover:text-white transition-colors flex items-center gap-2 flex-wrap {unread ? 'text-white font-semibold' : 'text-white/70'}">
						<span class="text-white/80 font-medium">#{mi + 1}</span>

						<!-- Sent / Received / Unread -->
						{#if sent}
							<span class="text-xs px-1.5 py-0.5 rounded font-medium" style="background:#00f9cf14; color:#00f9cf;">Sent</span>
						{:else if unread}
							<span class="text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1" style="background:#8c45ff20; color:#b88aff;">
								<span class="w-1.5 h-1.5 rounded-full inline-block" style="background:#b88aff;"></span>
								Unread
							</span>
						{:else}
							<span class="text-xs px-1.5 py-0.5 rounded font-medium" style="background:#8c45ff14; color:#b88aff;">Received</span>
						{/if}

						<!-- Sentiment class badge -->
						{#if scColors}
							<span class="text-xs px-1.5 py-0.5 rounded" style="background:{scColors.bg}; color:{scColors.color};">{msg.metadata.sentimentClass}</span>
						{/if}

						<!-- Existing granular sentiment + stage -->
						<span class="badge-cyan">{msg.metadata.sentiment}</span>
						<span class="badge-purple">{msg.metadata.relationshipStage}</span>

						<!-- Urgency -->
						{#if msg.metadata.urgency !== 'low'}
							<span class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(255,107,107,0.12); color:#ff8080;">{msg.metadata.urgency}</span>
						{/if}

						<!-- Business value -->
						{#if msg.metadata.businessValue != null}
							<span class="text-[10px] px-1.5 py-0.5 rounded font-mono" style="background:#29b0ff14; color:#5cc4ff;">
								bv {msg.metadata.businessValue.toFixed(2)}
							</span>
						{/if}

						<!-- Email category -->
						{#if msg.metadata.emailCategory}
							<span class="badge-blue">{msg.metadata.emailCategory}</span>
						{/if}
					</summary>
					<div class="flex flex-col border-t border-[#222336]">
						<!-- Email headers + response time -->
						<div class="px-4 py-3 flex flex-col gap-1 text-xs border-b border-[#222336]">
							{#if from}<div><span class="text-white/40">From:</span> <span class="text-white/70">{from}</span></div>{/if}
							{#if to}<div><span class="text-white/40">To:</span> <span class="text-white/70">{to}</span></div>{/if}
							{#if date}<div><span class="text-white/40">Date:</span> <span class="text-white/70">{date}</span></div>{/if}
							{#if msg.metadata.responseTimeMinutes != null}
								<div style="color:#29b0ff;">replied in {formatResponseTime(msg.metadata.responseTimeMinutes)}</div>
							{/if}
						</div>

						<!-- Email body -->
						<div class="px-4 py-3 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
							{decodeEmailBody(msg.gmail.payload?.body?.data ?? '')}
						</div>

						<!-- Metadata tags -->
						{#if (msg.metadata.topics?.length ?? 0) > 0 || (msg.metadata.personalDetailsMentioned?.length ?? 0) > 0}
							<div class="px-4 py-2.5 flex flex-wrap gap-1.5 border-t border-[#222336]">
								{#each msg.metadata.topics ?? [] as topic}
									<span class="badge-blue">{topic}</span>
								{/each}
								{#each msg.metadata.personalDetailsMentioned ?? [] as detail}
									<span class="badge-purple">{detail}</span>
								{/each}
							</div>
						{/if}
					</div>
				</details>
			{/each}
		</div>
	</div>
{/each}
