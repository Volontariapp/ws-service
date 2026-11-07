import type { ILivePositionClientPayload } from '@volontariapp/messaging';
import { isValidLatitude, isValidLongitude } from './live-geo.js';
import { LIVE_ID_PATTERN } from './live.constants.js';

/**
 * Valide un message `live.position` recu du client (types et bornes). Ne conserve que les trois
 * champs attendus : tout le reste du message est ignore.
 */
export const parseLivePositionPayload = (body: unknown): ILivePositionClientPayload | null => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }
  const { eventId, latitude, longitude } = body as Record<string, unknown>;
  if (typeof eventId !== 'string' || !LIVE_ID_PATTERN.test(eventId)) {
    return null;
  }
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }
  return { eventId, latitude, longitude };
};
