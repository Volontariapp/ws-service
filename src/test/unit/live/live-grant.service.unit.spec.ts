import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { LiveGrantService } from '../../../live/live-grant.service.js';
import {
  LIVE_GRANT_MAX_DURATION_MS,
  LIVE_MIN_UPDATE_INTERVAL_MS,
  LIVE_POSITION_TTL_S,
} from '../../../live/live.constants.js';
import {
  LIVE_EVENT_ID,
  LIVE_NOW_MS,
  LIVE_USER_ID,
  createLiveGrant,
  createLiveGrantRequest,
  isoAfter,
} from '../../helpers/factories/live.factory.js';
import {
  createRedisProviderMock,
  type RedisProviderMock,
} from '../../helpers/mocks/redis-provider.mock.js';

/** `Redis.set` est surcharge : on compare les appels bruts, sans choisir une surcharge. */
const setCallsOf = (redisMock: RedisProviderMock): unknown[][] => redisMock.redis.set.mock.calls;

describe('LiveGrantService (Unit)', () => {
  let redisMock: RedisProviderMock;
  let service: LiveGrantService;

  beforeEach(() => {
    redisMock = createRedisProviderMock();
    service = new LiveGrantService(redisMock.provider);
    jest.spyOn(Date, 'now').mockReturnValue(LIVE_NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('grant', () => {
    it('writes the grant under live:grant:{eventId}:{userId} with a TTL up to expiresAt', async () => {
      const request = createLiveGrantRequest({ expiresAt: isoAfter(2 * 60 * 60 * 1000) });

      await service.grant(request);

      expect(setCallsOf(redisMock)).toEqual([
        [
          'live:grant:event-1:user-1',
          JSON.stringify({
            organizerId: request.organizerId,
            eventLatitude: request.eventLatitude,
            eventLongitude: request.eventLongitude,
            expiresAt: request.expiresAt,
          }),
          'EX',
          7200,
        ],
      ]);
    });

    it('rounds the TTL up to the next second and never goes below one second', async () => {
      await service.grant(createLiveGrantRequest({ expiresAt: isoAfter(1500) }));
      await service.grant(createLiveGrantRequest({ expiresAt: isoAfter(1) }));

      expect(setCallsOf(redisMock).map((call) => call.slice(2))).toEqual([
        ['EX', 2],
        ['EX', 1],
      ]);
    });

    it('accepts exactly the 8 hour ceiling', async () => {
      await service.grant(
        createLiveGrantRequest({ expiresAt: isoAfter(LIVE_GRANT_MAX_DURATION_MS) }),
      );

      expect(setCallsOf(redisMock).map((call) => call.slice(2))).toEqual([['EX', 28_800]]);
    });

    it('rejects an expiresAt already in the past', async () => {
      await expect(
        service.grant(createLiveGrantRequest({ expiresAt: isoAfter(-1000) })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(redisMock.redis.set).not.toHaveBeenCalled();
    });

    it('rejects an expiresAt equal to now', async () => {
      await expect(
        service.grant(createLiveGrantRequest({ expiresAt: isoAfter(0) })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expiresAt beyond now plus 8 hours', async () => {
      await expect(
        service.grant(
          createLiveGrantRequest({ expiresAt: isoAfter(LIVE_GRANT_MAX_DURATION_MS + 1000) }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(redisMock.redis.set).not.toHaveBeenCalled();
    });

    it('rejects an expiresAt that is not a date', async () => {
      await expect(
        service.grant(createLiveGrantRequest({ expiresAt: 'tomorrow' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getGrant', () => {
    it('returns the parsed grant', async () => {
      const grant = createLiveGrant();
      redisMock.redis.get.mockResolvedValue(JSON.stringify(grant));

      await expect(service.getGrant(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toEqual(grant);
      expect(redisMock.redis.get).toHaveBeenCalledWith('live:grant:event-1:user-1');
    });

    it('returns null when the key is absent', async () => {
      redisMock.redis.get.mockResolvedValue(null);

      await expect(service.getGrant(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBeNull();
    });

    it('returns null (fail closed) when the stored value is corrupt', async () => {
      redisMock.redis.get.mockResolvedValue('{not json');
      await expect(service.getGrant(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBeNull();

      redisMock.redis.get.mockResolvedValue(JSON.stringify({ organizerId: 1 }));
      await expect(service.getGrant(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBeNull();
    });
  });

  describe('revoke', () => {
    it('deletes the grant, the position and the cadence key and returns the removed grant', async () => {
      const grant = createLiveGrant();
      redisMock.transaction.exec.mockResolvedValue([
        [null, JSON.stringify(grant)],
        [null, 3],
      ]);

      await expect(service.revoke(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toEqual(grant);

      expect(redisMock.transaction.get).toHaveBeenCalledWith('live:grant:event-1:user-1');
      expect(redisMock.transaction.del).toHaveBeenCalledWith(
        'live:grant:event-1:user-1',
        'live:pos:event-1:user-1',
        'live:rate:event-1:user-1',
      );
    });

    it('returns null when the grant no longer exists, and still deletes the keys', async () => {
      redisMock.transaction.exec.mockResolvedValue([
        [null, null],
        [null, 0],
      ]);

      await expect(service.revoke(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBeNull();
      expect(redisMock.transaction.del).toHaveBeenCalledTimes(1);
    });

    it('throws when the transaction fails', async () => {
      redisMock.transaction.exec.mockResolvedValue(null);

      await expect(service.revoke(LIVE_EVENT_ID, LIVE_USER_ID)).rejects.toThrow();
    });
  });

  describe('acquireCadenceSlot', () => {
    it('sets live:rate with NX and a 10 s expiry and returns true when acquired', async () => {
      redisMock.redis.set.mockResolvedValue('OK');

      await expect(service.acquireCadenceSlot(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBe(true);
      expect(setCallsOf(redisMock)).toEqual([
        ['live:rate:event-1:user-1', '1', 'PX', LIVE_MIN_UPDATE_INTERVAL_MS, 'NX'],
      ]);
    });

    it('returns false when the slot is already taken', async () => {
      redisMock.redis.set.mockResolvedValue(null);

      await expect(service.acquireCadenceSlot(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBe(false);
    });
  });

  describe('storePosition', () => {
    it('writes the rounded position with a 120 s TTL', async () => {
      const position = { latitude: 48.857, longitude: 2.352, updatedAt: isoAfter(0) };

      await service.storePosition(LIVE_EVENT_ID, LIVE_USER_ID, position);

      expect(setCallsOf(redisMock)).toEqual([
        ['live:pos:event-1:user-1', JSON.stringify(position), 'EX', LIVE_POSITION_TTL_S],
      ]);
    });
  });
});
