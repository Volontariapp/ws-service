import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { RevokeLiveGrantCommandDTO } from '../../../../../modules/live/dto/request/command/revoke-live-grant.command.dto.js';
import { LIVE_EVENT_ID, LIVE_USER_ID } from '../../../../helpers/factories/live.factory.js';

describe('RevokeLiveGrantCommandDTO (Unit)', () => {
  it('reads the reason from the query', () => {
    const command = RevokeLiveGrantCommandDTO.fromRequest(
      LIVE_EVENT_ID,
      LIVE_USER_ID,
      'ARRIVED',
      undefined,
    );

    expect(command).toMatchObject({
      eventId: LIVE_EVENT_ID,
      userId: LIVE_USER_ID,
      reason: 'ARRIVED',
    });
  });

  it('reads the reason from the body when the query has none', () => {
    const command = RevokeLiveGrantCommandDTO.fromRequest(LIVE_EVENT_ID, LIVE_USER_ID, undefined, {
      reason: 'LEFT',
    });

    expect(command.reason).toBe('LEFT');
  });

  it('prefers the query over the body', () => {
    const command = RevokeLiveGrantCommandDTO.fromRequest(LIVE_EVENT_ID, LIVE_USER_ID, 'ARRIVED', {
      reason: 'LEFT',
    });

    expect(command.reason).toBe('ARRIVED');
  });

  it('defaults the reason to STOPPED', () => {
    expect(
      RevokeLiveGrantCommandDTO.fromRequest(LIVE_EVENT_ID, LIVE_USER_ID, undefined, undefined)
        .reason,
    ).toBe('STOPPED');
    expect(
      RevokeLiveGrantCommandDTO.fromRequest(LIVE_EVENT_ID, LIVE_USER_ID, undefined, 'not an object')
        .reason,
    ).toBe('STOPPED');
  });

  it.each(['REVOKED', 'EXPIRED', 'EVENT_ENDED', 'arrived', ''])(
    'rejects the reason %p with 400',
    (reason) => {
      expect(() =>
        RevokeLiveGrantCommandDTO.fromRequest(LIVE_EVENT_ID, LIVE_USER_ID, reason, undefined),
      ).toThrow(BadRequestException);
    },
  );

  it('rejects malformed path identifiers with 400', () => {
    expect(() =>
      RevokeLiveGrantCommandDTO.fromRequest('event-1:other', LIVE_USER_ID, undefined, undefined),
    ).toThrow(BadRequestException);
    expect(() =>
      RevokeLiveGrantCommandDTO.fromRequest(LIVE_EVENT_ID, 'user 1', undefined, undefined),
    ).toThrow(BadRequestException);
  });
});
