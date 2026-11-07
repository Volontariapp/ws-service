import type { LiveSharingStopReason } from '@volontariapp/messaging';

export type LiveRevokeReason = Extract<LiveSharingStopReason, 'ARRIVED' | 'STOPPED' | 'LEFT'>;

export const LIVE_REVOKE_REASONS: readonly LiveRevokeReason[] = ['ARRIVED', 'STOPPED', 'LEFT'];
export const LIVE_DEFAULT_REVOKE_REASON: LiveRevokeReason = 'STOPPED';

export const isLiveRevokeReason = (value: unknown): value is LiveRevokeReason =>
  typeof value === 'string' && LIVE_REVOKE_REASONS.some((reason) => reason === value);
