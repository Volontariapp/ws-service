import type { ILiveGrantRequest, ILivePositionClientPayload } from '@volontariapp/messaging';
import type { LiveGrant } from '../../../live/live.types.js';

export const LIVE_EVENT_ID = 'event-1';
export const LIVE_USER_ID = 'user-1';
export const LIVE_ORGANIZER_ID = 'organizer-1';

/** Horloge figee des tests : 2026-11-07T12:00:00.000Z. */
export const LIVE_NOW_MS = Date.parse('2026-11-07T12:00:00.000Z');

export const isoAfter = (offsetMs: number): string =>
  new Date(LIVE_NOW_MS + offsetMs).toISOString();

export const createLiveGrantRequest = (
  overrides: Partial<ILiveGrantRequest> = {},
): ILiveGrantRequest => ({
  eventId: LIVE_EVENT_ID,
  userId: LIVE_USER_ID,
  organizerId: LIVE_ORGANIZER_ID,
  eventLatitude: 48.8527,
  eventLongitude: 2.352,
  expiresAt: isoAfter(2 * 60 * 60 * 1000),
  ...overrides,
});

export const createLiveGrant = (overrides: Partial<LiveGrant> = {}): LiveGrant => ({
  organizerId: LIVE_ORGANIZER_ID,
  eventLatitude: 48.8527,
  eventLongitude: 2.352,
  expiresAt: isoAfter(2 * 60 * 60 * 1000),
  ...overrides,
});

export const createLivePositionPayload = (
  overrides: Partial<ILivePositionClientPayload> = {},
): ILivePositionClientPayload => ({
  eventId: LIVE_EVENT_ID,
  latitude: 48.8566,
  longitude: 2.3522,
  ...overrides,
});
