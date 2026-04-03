function randomBase64(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function randomHex(len: number): string {
  const chars = '0123456789abcdef';
  let r = '';
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * 16)];
  return r;
}

export function buildOutlookCodeValues(
  aiValues: Record<string, string>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const bodyText = aiValues.body || '';
  const timestamp = (overrides.internalDate as number) || Date.now();
  const isoDate = new Date(timestamp).toISOString();
  const urgency = overrides.urgency as string;

  const messageId = `AAMkAGI2${randomBase64(40)}`;
  const conversationId = `AAQkAGI2${randomBase64(32)}_${overrides.groupId || randomBase64(8)}`;

  return {
    id: messageId,
    createdDateTime: isoDate,
    lastModifiedDateTime: isoDate,
    receivedDateTime: isoDate,
    sentDateTime: isoDate,
    bodyPreview: bodyText.replace(/\n/g, ' ').substring(0, 255),
    importance: urgency === 'high' ? 'high' : urgency === 'medium' ? 'normal' : 'low',
    isRead: !(overrides.labelIds as string[] || []).includes('UNREAD'),
    conversationId,
    conversationIndex: `AQHa${randomBase64(24)}`,
    internetMessageId: `<${randomHex(24)}@outlook.com>`,
    toRecipients: [{
      emailAddress: {
        name: overrides.recipientName || aiValues.toName || '',
        address: overrides.recipientEmail || aiValues.toEmail || '',
      },
    }],
    ccRecipients: [],
    categories: [],
    _itemId: messageId,
  };
}
