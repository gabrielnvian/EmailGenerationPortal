import type { SchemaNode } from '../../../types.js';

export const outlookSchema: SchemaNode = {
  '@odata.type': '#microsoft.graph.message',
  id: '$code:id',
  createdDateTime: '$code:createdDateTime',
  lastModifiedDateTime: '$code:lastModifiedDateTime',
  receivedDateTime: '$code:receivedDateTime',
  sentDateTime: '$code:sentDateTime',
  subject: '$ai:subject',
  bodyPreview: '$code:bodyPreview',
  importance: '$code:importance',
  isRead: '$code:isRead',
  isDraft: false,
  conversationId: '$code:conversationId',
  conversationIndex: '$code:conversationIndex',
  internetMessageId: '$code:internetMessageId',
  body: {
    contentType: 'text',
    content: '$ai:body',
  },
  from: {
    emailAddress: {
      name: '$ai:fromName',
      address: '$ai:fromEmail',
    },
  },
  toRecipients: '$code:toRecipients',
  ccRecipients: '$code:ccRecipients',
  categories: '$code:categories',
  flag: {
    flagStatus: 'notFlagged',
  },
};
