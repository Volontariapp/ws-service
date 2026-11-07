import type { LiveSharingStopReason } from '@volontariapp/messaging';

export type LiveRevokeReason = Extract<LiveSharingStopReason, 'ARRIVED' | 'STOPPED' | 'LEFT'>;

export const LIVE_REVOKE_REASONS: readonly LiveRevokeReason[] = ['ARRIVED', 'STOPPED', 'LEFT'];
export const LIVE_DEFAULT_REVOKE_REASON: LiveRevokeReason = 'STOPPED';

/** Valeur stockee sous `live:grant:{eventId}:{userId}`. */
export interface LiveGrant {
  organizerId: string;
  eventLatitude: number;
  eventLongitude: number;
  expiresAt: string;
}

/** Valeur stockee sous `live:pos:{eventId}:{userId}` (coordonnees deja arrondies). */
export interface LiveStoredPosition {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export const isLiveRevokeReason = (value: unknown): value is LiveRevokeReason =>
  typeof value === 'string' && LIVE_REVOKE_REASONS.some((reason) => reason === value);
