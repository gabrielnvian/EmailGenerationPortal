<script lang="ts">
	import {decodeEmailBody, getHeader, type GenerateData, type GmailMessage} from "./generate/generate";

	export let data: GenerateData;

	function isSentByOwner(gmail: GmailMessage): boolean {
		return gmail.labelIds?.includes('SENT') ?? false;
	}
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
	</div>
{/if}

<!-- Timeline -->
{#each data.timeline as thread, ti}
	<div class="surface p-5 flex flex-col gap-3">
		<div class="flex items-center gap-2">
			<div class="section-label section-label--cyan">Thread {ti + 1}</div>
			<span class="text-sm text-white/60 ml-1 truncate">{thread.subject}</span>
			<span class="text-xs text-white/40 ml-auto flex-shrink-0">{thread.messages.length} msg{thread.messages.length === 1 ? '' : 's'}</span>
		</div>
		<div class="flex flex-col gap-2">
			{#each thread.messages as msg, mi}
				{@const from = getHeader(msg.gmail, 'From')}
				{@const to = getHeader(msg.gmail, 'To')}
				{@const date = getHeader(msg.gmail, 'Date')}
				{@const sent = isSentByOwner(msg.gmail)}
				<details class="surface-inset overflow-hidden">
					<summary class="px-4 py-3 cursor-pointer text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2.5">
						<span class="text-white/80 font-medium">#{mi + 1}</span>
						<span class="text-xs px-1.5 py-0.5 rounded font-medium" style="background:{sent ? '#00f9cf14' : '#8c45ff14'}; color:{sent ? '#00f9cf' : '#b88aff'};">
							{sent ? 'Sent' : 'Received'}
						</span>
						<span class="badge-cyan">{msg.metadata.sentiment}</span>
						<span class="badge-purple">{msg.metadata.relationshipStage}</span>
						{#if msg.metadata.urgency !== 'low'}
							<span class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(255,107,107,0.12); color:#ff8080;">{msg.metadata.urgency}</span>
						{/if}
					</summary>
					<div class="flex flex-col border-t border-[#222336]">
						<div class="px-4 py-3 flex flex-col gap-1 text-xs border-b border-[#222336]">
							{#if from}<div><span class="text-white/40">From:</span> <span class="text-white/70">{from}</span></div>{/if}
							{#if to}<div><span class="text-white/40">To:</span> <span class="text-white/70">{to}</span></div>{/if}
							{#if date}<div><span class="text-white/40">Date:</span> <span class="text-white/70">{date}</span></div>{/if}
						</div>
						<div class="px-4 py-3 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
							{decodeEmailBody(msg.gmail.payload?.body?.data ?? '')}
						</div>
						{#if msg.metadata.topics.length > 0 || msg.metadata.personalDetailsMentioned.length > 0}
							<div class="px-4 py-2.5 flex flex-wrap gap-1.5 border-t border-[#222336]">
								{#each msg.metadata.topics as topic}
									<span class="badge-blue">{topic}</span>
								{/each}
								{#each msg.metadata.personalDetailsMentioned as detail}
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
