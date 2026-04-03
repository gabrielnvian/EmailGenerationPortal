export function randomHex(len: number): string {
  const chars = '0123456789abcdef';
  let r = '';
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * 16)];
  return r;
}

export function buildGmailCodeValues(
  aiValues: Record<string, string>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const bodyText = aiValues.body || '';
  const messageId = `<${randomHex(12)}.${randomHex(8)}@mail.gmail.com>`;
  const internalDate = String(overrides.internalDate || Date.now());
  const bodySize = Buffer.byteLength(bodyText, 'utf8');

  return {
    id: randomHex(16),
    threadId: overrides.groupId || randomHex(16),
    labelIds: overrides.labelIds || ['INBOX', 'UNREAD'],
    snippet: bodyText.replace(/\n/g, ' ').substring(0, 100),
    historyId: String(Math.floor(Math.random() * 900000) + 100000),
    internalDate,
    sizeEstimate: bodySize + 2000 + Math.floor(Math.random() * 500),
    dateHeader: new Date(parseInt(internalDate)).toUTCString(),
    messageId,
    bodySize,
    bodyBase64: Buffer.from(bodyText).toString('base64url'),
    _itemId: messageId,
  };
}
