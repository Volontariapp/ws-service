import { describe, expect, it } from '@jest/globals';
import {
  LIVE_DEFAULT_REVOKE_REASON,
  LIVE_REVOKE_REASONS,
  isLiveRevokeReason,
} from '../../../../../modules/live/domain/live-revoke-reason.js';

describe('live revoke reason (Unit)', () => {
  it('lists ARRIVED, STOPPED and LEFT with STOPPED as default', () => {
    expect(LIVE_REVOKE_REASONS).toEqual(['ARRIVED', 'STOPPED', 'LEFT']);
    expect(LIVE_DEFAULT_REVOKE_REASON).toBe('STOPPED');
  });

  it.each(['ARRIVED', 'STOPPED', 'LEFT'])('accepts %p', (reason) => {
    expect(isLiveRevokeReason(reason)).toBe(true);
  });

  it.each(['REVOKED', 'EXPIRED', 'EVENT_ENDED', 'arrived', '', 1, null, undefined])(
    'rejects %p',
    (reason) => {
      expect(isLiveRevokeReason(reason)).toBe(false);
    },
  );
});
