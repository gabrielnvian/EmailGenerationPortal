<script lang="ts">
	import {decodeEmailBody, formatResponseTime, extractMessageInfo, isSentByOwner, isUnread, type GenerateData, type OutputFormat, type TimelineMessage} from "./generate/generate";

	export let data: GenerateData;

	$: format = data.format ?? 'gmail';
	$: isEmail = format === 'gmail' || format === 'outlook';

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

	const FORMAT_LABELS: Record<string, string> = {
		gmail: 'Gmail',
		outlook: 'Outlook',
		gcal: 'Google Calendar',
	};

	// Flat messages for distributions and scroll targeting
	type FlatMsg = { ti: number; mi: number; msg: TimelineMessage; elId: string };
	$: flatMessages = data.timeline.flatMap((g, ti) =>
		g.messages.map((msg, mi) => ({ ti, mi, msg, elId: `msg-${ti}-${mi}` } as FlatMsg))
	);
	$: allMessages = flatMessages.map(f => f.msg);

	$: sentimentClassDist = allMessages.reduce((acc, m) => {
		const cls = m.metadata.sentimentClass ?? 'neutral';
		acc[cls] = (acc[cls] ?? 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	$: categoryDist = allMessages.reduce((acc, m) => {
		const cat = m.metadata.category;
		if (cat) acc[cat] = (acc[cat] ?? 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	$: hasSentimentClasses = allMessages.some(m => m.metadata.sentimentClass);
	$: hasCategories = Object.keys(categoryDist).length > 0;

	function scrollToSentiment(sentiment: string, badgeIndex: number) {
		const occurrence = data.summary.sentimentProgression.slice(0, badgeIndex).filter(s => s === sentiment).length;
		let count = 0;
		for (const fm of flatMessages) {
			if (fm.msg.metadata.sentiment === sentiment) {
				if (count === occurrence) {
					const el = document.getElementById(fm.elId);
					if (el) {
						if (el instanceof HTMLDetailsElement) el.open = true;
						el.scrollIntoView({ behavior: 'smooth', block: 'center' });
						el.style.boxShadow = '0 0 0 2px #00f9cf66';
						setTimeout(() => { el.style.boxShadow = ''; }, 2000);
					}
					return;
				}
				count++;
			}
		}
	}
</script>

<!-- Summary -->
{#if data.summary.arcDescription || data.summary.totalMessages}
	<div class="surface p-5 flex flex-col gap-3">
		<div class="flex items-center gap-2">
			<div class="section-label section-label--purple">Summary</div>
			<span class="badge-blue ml-auto">{FORMAT_LABELS[format] ?? format}</span>
		</div>
		{#if data.summary.arcDescription}
			<p class="text-sm text-white/80">{data.summary.arcDescription}</p>
		{/if}
		<div class="flex flex-wrap gap-4 text-xs text-white/50">
			<span>{data.summary.totalMessages} {isEmail ? 'messages' : 'events'}</span>
			<span>{data.summary.timespanDays} days</span>
		</div>
		{#if data.summary.sentimentProgression.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each data.summary.sentimentProgression as sentiment, i}
					<button
						class="badge-cyan cursor-pointer hover:brightness-125 transition-all"
						on:click={() => scrollToSentiment(sentiment, i)}
						title="Jump to message"
					>{sentiment}</button>
					{#if i < data.summary.sentimentProgression.length - 1}
						<span class="text-white/25 text-xs self-center">→</span>
					{/if}
				{/each}
			</div>
		{/if}

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
{#each data.timeline as group, ti}
	{@const scoring = group.relationshipScoring}
	<div class="surface p-5 flex flex-col gap-3">
		<!-- Group header -->
		<div class="flex items-center gap-2 flex-wrap">
			<div class="section-label section-label--cyan">{isEmail ? 'Thread' : 'Event'} {ti + 1}</div>
			<span class="text-sm text-white/60 ml-1 truncate">{group.title}</span>
			<span class="text-xs text-white/40 ml-auto flex-shrink-0">
				{group.messages.length} {isEmail ? (group.messages.length === 1 ? 'msg' : 'msgs') : (group.messages.length === 1 ? 'event' : 'events')}
			</span>
		</div>

		{#if scoring}
			<div class="flex flex-wrap gap-3 text-xs text-white/50">
				<span>{scoring.communicationFrequency.toFixed(2)} {isEmail ? 'msgs' : 'events'}/day</span>
				<span>{TREND_ARROWS[scoring.sentimentTrend] ?? '→'} {scoring.sentimentTrend}</span>
				<span class="px-1.5 py-0.5 rounded text-[10px] font-medium"
					style="background:{scoring.engagementLevel === 'high' ? '#00f9cf14' : scoring.engagementLevel === 'medium' ? '#29b0ff14' : '#ffffff08'}; color:{scoring.engagementLevel === 'high' ? '#00f9cf' : scoring.engagementLevel === 'medium' ? '#5cc4ff' : 'rgba(255,255,255,0.45)'};">
					{scoring.engagementLevel} engagement
				</span>
				<span>{scoring.daysSinceLastContact}d since last contact</span>
			</div>
		{/if}

		<!-- Messages -->
		<div class="flex flex-col gap-2">
			{#each group.messages as msg, mi}
				{@const info = extractMessageInfo(msg.output, format)}
				{@const sent = isSentByOwner(msg.output, format)}
				{@const unreadMsg = !sent && isUnread(msg.output, format)}
				{@const scColors = SENTIMENT_CLASS_COLORS[msg.metadata.sentimentClass ?? ''] ?? null}
				<details id="msg-{ti}-{mi}" class="surface-inset overflow-hidden" style="transition: box-shadow 0.3s ease;">
					<summary class="px-4 py-3 cursor-pointer text-sm hover:text-white transition-colors flex items-center gap-2 flex-wrap {unreadMsg ? 'text-white font-semibold' : 'text-white/70'}">
						<span class="text-white/80 font-medium">#{mi + 1}</span>

						<!-- Sent / Received / Unread (email only) -->
						{#if isEmail}
							{#if sent}
								<span class="text-xs px-1.5 py-0.5 rounded font-medium" style="background:#00f9cf14; color:#00f9cf;">Sent</span>
							{:else if unreadMsg}
								<span class="text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1" style="background:#8c45ff20; color:#b88aff;">
									<span class="w-1.5 h-1.5 rounded-full inline-block" style="background:#b88aff;"></span>
									Unread
								</span>
							{:else}
								<span class="text-xs px-1.5 py-0.5 rounded font-medium" style="background:#8c45ff14; color:#b88aff;">Received</span>
							{/if}
						{/if}

						{#if scColors}
							<span class="text-xs px-1.5 py-0.5 rounded" style="background:{scColors.bg}; color:{scColors.color};">{msg.metadata.sentimentClass}</span>
						{/if}

						<span class="badge-cyan">{msg.metadata.sentiment}</span>
						<span class="badge-purple">{msg.metadata.relationshipStage}</span>

						{#if msg.metadata.urgency !== 'low'}
							<span class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(255,107,107,0.12); color:#ff8080;">{msg.metadata.urgency}</span>
						{/if}

						{#if msg.metadata.businessValue != null}
							<span class="text-[10px] px-1.5 py-0.5 rounded font-mono" style="background:#29b0ff14; color:#5cc4ff;">
								bv {msg.metadata.businessValue.toFixed(2)}
							</span>
						{/if}

						{#if msg.metadata.category}
							<span class="badge-blue">{msg.metadata.category}</span>
						{/if}
					</summary>
					<div class="flex flex-col border-t border-[#222336]">
						<!-- Headers -->
						<div class="px-4 py-3 flex flex-col gap-1 text-xs border-b border-[#222336]">
							{#if isEmail}
								{#if info.from}<div><span class="text-white/40">From:</span> <span class="text-white/70">{info.from}</span></div>{/if}
								{#if info.to}<div><span class="text-white/40">To:</span> <span class="text-white/70">{info.to}</span></div>{/if}
								{#if info.date}<div><span class="text-white/40">Date:</span> <span class="text-white/70">{info.date}</span></div>{/if}
							{:else}
								<!-- Calendar event -->
								{@const evt = msg.output}
								{#if info.date}<div><span class="text-white/40">Start:</span> <span class="text-white/70">{info.date}</span></div>{/if}
								{#if evt.end?.dateTime}<div><span class="text-white/40">End:</span> <span class="text-white/70">{evt.end.dateTime}</span></div>{/if}
								{#if evt.location}<div><span class="text-white/40">Location:</span> <span class="text-white/70">{evt.location}</span></div>{/if}
								{#if info.to}<div><span class="text-white/40">Attendees:</span> <span class="text-white/70">{info.to}</span></div>{/if}
								{#if evt.conferenceData?.entryPoints?.[0]?.uri}
									<div><span class="text-white/40">Video:</span> <span class="text-white/70">{evt.conferenceData.entryPoints[0].uri}</span></div>
								{/if}
							{/if}
							{#if msg.metadata.responseTimeMinutes != null}
								<div style="color:#29b0ff;">replied in {formatResponseTime(msg.metadata.responseTimeMinutes)}</div>
							{/if}
						</div>

						<!-- Body -->
						<div class="px-4 py-3 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
							{info.body}
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
