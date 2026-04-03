function randomAlphaNum(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
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

const DURATIONS = [30, 45, 60, 60, 90, 120]; // weighted toward 60 min

function pickResponseStatus(): string {
  const r = Math.random();
  if (r < 0.7) return 'accepted';
  if (r < 0.9) return 'tentative';
  return 'needsAction';
}

export function buildGCalCodeValues(
  aiValues: Record<string, string>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const timestamp = (overrides.internalDate as number) || Date.now();
  const startDate = new Date(timestamp);

  // Snap to business hours if not already
  if (startDate.getUTCHours() < 9) startDate.setUTCHours(9, 0, 0, 0);
  if (startDate.getUTCHours() > 17) startDate.setUTCHours(14, 0, 0, 0);

  const durationMinutes = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);

  const tz = 'America/New_York';
  const eventId = randomAlphaNum(26);
  const isoCreated = new Date(startDate.getTime() - 7 * 24 * 60 * 60_000).toISOString();

  const organizerEmail = aiValues.organizerEmail || '';
  const organizerName = aiValues.organizerName || '';
  const recipientEmail = (overrides.recipientEmail as string) || '';
  const recipientName = (overrides.recipientName as string) || '';

  const hasMeet = Math.random() > 0.3;
  const meetCode = `${randomAlphaNum(3)}-${randomAlphaNum(4)}-${randomAlphaNum(3)}`;

  return {
    id: eventId,
    etag: `"${randomHex(16)}"`,
    htmlLink: `https://www.google.com/calendar/event?eid=${Buffer.from(eventId).toString('base64url')}`,
    created: isoCreated,
    updated: isoCreated,
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    timeZone: tz,
    attendees: [
      {
        email: organizerEmail,
        displayName: organizerName,
        organizer: true,
        self: true,
        responseStatus: 'accepted',
      },
      {
        email: recipientEmail,
        displayName: recipientName,
        responseStatus: pickResponseStatus(),
      },
    ],
    useDefaultReminders: true,
    conferenceData: hasMeet ? {
      entryPoints: [
        {
          entryPointType: 'video',
          uri: `https://meet.google.com/${meetCode}`,
          label: `meet.google.com/${meetCode}`,
        },
      ],
      conferenceSolution: {
        key: { type: 'hangoutsMeet' },
        name: 'Google Meet',
      },
      conferenceId: meetCode,
    } : null,
    _itemId: eventId,
  };
}
