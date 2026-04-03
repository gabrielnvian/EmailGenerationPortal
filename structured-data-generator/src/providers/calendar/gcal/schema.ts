import type { SchemaNode } from '../../../types.js';

export const gcalSchema: SchemaNode = {
  kind: 'calendar#event',
  etag: '$code:etag',
  id: '$code:id',
  status: 'confirmed',
  htmlLink: '$code:htmlLink',
  created: '$code:created',
  updated: '$code:updated',
  summary: '$ai:summary',
  description: '$ai:description',
  location: '$ai:location',
  creator: {
    email: '$ai:organizerEmail',
    displayName: '$ai:organizerName',
  },
  organizer: {
    email: '$ai:organizerEmail',
    displayName: '$ai:organizerName',
  },
  start: {
    dateTime: '$code:startDateTime',
    timeZone: '$code:timeZone',
  },
  end: {
    dateTime: '$code:endDateTime',
    timeZone: '$code:timeZone',
  },
  attendees: '$code:attendees',
  reminders: {
    useDefault: '$code:useDefaultReminders',
  },
  conferenceData: '$code:conferenceData',
};
