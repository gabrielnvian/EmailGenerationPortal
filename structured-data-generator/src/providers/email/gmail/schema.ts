import type { SchemaNode } from '../../../types.js';

export const gmailSchema: SchemaNode = {
  id: '$code:id',
  threadId: '$code:threadId',
  labelIds: '$code:labelIds',
  snippet: '$code:snippet',
  historyId: '$code:historyId',
  internalDate: '$code:internalDate',
  sizeEstimate: '$code:sizeEstimate',
  payload: {
    partId: '',
    mimeType: 'text/plain',
    filename: '',
    headers: [
      { name: 'From', value: '$ai:from' },
      { name: 'To', value: '$ai:to' },
      { name: 'Subject', value: '$ai:subject' },
      { name: 'Date', value: '$code:dateHeader' },
      { name: 'Message-ID', value: '$code:messageId' },
      { name: 'MIME-Version', value: '1.0' },
      { name: 'Content-Type', value: 'text/plain; charset="UTF-8"' },
    ],
    body: {
      size: '$code:bodySize',
      data: '$code:bodyBase64',
    },
  },
};
