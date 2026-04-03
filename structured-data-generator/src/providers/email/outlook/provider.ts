import type { FormatProvider, WrapContext, CrossThreadContext } from '../../types.js';
import type { Persona, ItemPlan, GroupPlan } from '../../../types.js';
import { outlookSchema } from './schema.js';
import { buildOutlookCodeValues } from './generators.js';
import { resolve } from '../../../resolve.js';

const BODY_SYSTEM_PROMPT = `Write a realistic work email -- greeting, body (1-3 short paragraphs, natural and conversational), and a closing like "Best," or "Thanks," on its own line. No signature -- it is added by the email client.`;

const EMAIL_STOP_SEQUENCES = [
  '\nBest,', '\nThanks,', '\nCheers,', '\nRegards,',
  '\nSincerely,', '\nBest regards,', '\nKind regards,',
  '\nThank you,', '\nWarm regards,',
];

function buildSignature(sender: Persona): string {
  if (sender.signature) return sender.signature;
  const lines = [sender.name, `${sender.jobTitle}, ${sender.company}`];
  if (sender.phone) lines.push(sender.phone);
  lines.push(sender.email);
  return lines.join('\n');
}

export class OutlookFormatProvider implements FormatProvider {
  readonly formatId = 'outlook' as const;
  readonly domain = 'email' as const;

  getSystemPrompt(): string {
    return BODY_SYSTEM_PROMPT;
  }

  getStopSequences(): string[] {
    return EMAIL_STOP_SEQUENCES;
  }

  buildContentPrompt(
    sender: Persona,
    recipient: Persona,
    plan: ItemPlan,
    groupPlan: GroupPlan,
    relationship: string,
    previousMessages?: { senderName: string; body: string }[],
    crossThreadContext?: CrossThreadContext,
  ): string {
    let prompt = `You are ${sender.name}, ${sender.jobTitle} at ${sender.company}.`;
    if (sender.tone) prompt += ` Your tone: ${sender.tone}.`;
    prompt += `\nEmailing: ${recipient.name}, ${recipient.jobTitle} at ${recipient.company}.`;
    prompt += `\nRelationship: ${relationship}`;
    prompt += `\nSubject: ${groupPlan.title}`;
    prompt += `\nMood: ${plan.sentiment}`;

    if (plan.personalDetailsMentioned.length > 0) {
      prompt += `\nNaturally mention: ${plan.personalDetailsMentioned.join(', ')}`;
    }

    if (crossThreadContext?.completedTitles.length) {
      prompt += '\n\nPrevious conversation topics with this person:';
      for (const title of crossThreadContext.completedTitles) {
        prompt += `\n- ${title}`;
      }
    }

    if (crossThreadContext?.prevThreadMessages.length) {
      prompt += `\n\nLast conversation with ${crossThreadContext.otherPersonName}:`;
      for (const msg of crossThreadContext.prevThreadMessages) {
        prompt += `\n\n[${msg.senderName}]:\n${msg.body}`;
      }
    }

    if (previousMessages && previousMessages.length > 0) {
      prompt += '\n\nPrevious messages in this thread:';
      for (const msg of previousMessages) {
        prompt += `\n\n[${msg.senderName}]:\n${msg.body}`;
      }
      prompt += '\n\nWrite your reply. Do NOT repeat or paraphrase lines from the previous messages.';
    } else {
      prompt += '\n\nWrite the email.';
    }

    return prompt;
  }

  parseAiOutput(
    raw: string,
    sender: Persona,
    recipient: Persona,
    _plan: ItemPlan,
    groupPlan: GroupPlan,
    isFirst: boolean,
  ): Record<string, string> {
    const body = raw.trimEnd() + '\n\n' + buildSignature(sender);
    const subject = isFirst ? groupPlan.title : `RE: ${groupPlan.title}`;
    return {
      from: `${sender.name} <${sender.email}>`,
      to: `${recipient.name} <${recipient.email}>`,
      fromName: sender.name,
      fromEmail: sender.email,
      toName: recipient.name,
      toEmail: recipient.email,
      subject,
      body,
      date: _plan.date,
    };
  }

  wrap(canonical: Record<string, string>, context: WrapContext): unknown {
    const aiValues = {
      fromName: canonical.fromName,
      fromEmail: canonical.fromEmail,
      subject: canonical.subject,
      body: canonical.body,
    };

    const codeValues = buildOutlookCodeValues(aiValues, {
      groupId: context.groupId,
      internalDate: new Date(canonical.date).getTime() || Date.now(),
      labelIds: computeLabels(context.senderIndex, context.messageIndex, context.groupLength),
      urgency: context.urgency,
      recipientName: canonical.toName,
      recipientEmail: canonical.toEmail,
    });

    return resolve(outlookSchema, aiValues, codeValues);
  }
}

function computeLabels(senderIndex: number, messageIndex: number, groupLength: number): string[] {
  if (senderIndex === 0) return ['SENT'];
  const isRecent = messageIndex >= groupLength - 2;
  return isRecent ? ['INBOX', 'UNREAD', 'IMPORTANT'] : ['INBOX', 'IMPORTANT'];
}
