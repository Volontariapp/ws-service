import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RedisLiveGrantRepository } from '../../../../../../modules/live/repositories/redis/redis-live-grant.repository.js';
import {
  LIVE_EVENT_ID,
  LIVE_USER_ID,
  createLiveGrant,
} from '../../../../../helpers/factories/live.factory.js';
import {
  createRedisProviderMock,
  type RedisProviderMock,
} from '../../../../../helpers/mocks/redis-provider.mock.js';

/** `Redis.set` est surcharge : on compare les appels bruts, sans choisir une surcharge. */
const setCallsOf = (redisMock: RedisProviderMock): unknown[][] => redisMock.redis.set.mock.calls;

describe('RedisLiveGrantRepository (Unit)', () => {
  let redisMock: RedisProviderMock;
  let repository: RedisLiveGrantRepository;

  beforeEach(() => {
    redisMock = createRedisProviderMock();
    repository = new RedisLiveGrantRepository(redisMock.provider);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('save', () => {
    it('writes the grant under live:grant:{eventId}:{userId} with the given TTL', async () => {
      const grant = createLiveGrant();

      await repository.save(LIVE_EVENT_ID, LIVE_USER_ID, grant, 7200);

      expect(setCallsOf(redisMock)).toEqual([
        [
          'live:grant:event-1:user-1',
          JSON.stringify({
            organizerId: grant.organizerId,
            eventLatitude: 48.8527,
            eventLongitude: 2.352,
            expiresAt: grant.expiresAt,
          }),
          'EX',
          7200,
        ],
      ]);
    });
  });

  describe('find', () => {
    it('returns the parsed grant', async () => {
      const grant = createLiveGrant();
      redisMock.redis.get.mockResolvedValue(grant.serialize());

      await expect(repository.find(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toEqual(grant);
      expect(redisMock.redis.get).toHaveBeenCalledWith('live:grant:event-1:user-1');
    });

    it('returns null when the key is absent', async () => {
      redisMock.redis.get.mockResolvedValue(null);

      await expect(repository.find(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBeNull();
    });

    it('returns null (fail closed) when the stored value is corrupt', async () => {
      redisMock.redis.get.mockResolvedValue('{not json');
      await expect(repository.find(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBeNull();

      redisMock.redis.get.mockResolvedValue(JSON.stringify({ organizerId: 1 }));
      await expect(repository.find(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBeNull();
    });
  });

  describe('removeWithAssociatedData', () => {
    it('deletes the grant, the position and the cadence key and returns the removed grant', async () => {
      const grant = createLiveGrant();
      redisMock.transaction.exec.mockResolvedValue([
        [null, grant.serialize()],
        [null, 3],
      ]);

      await expect(
        repository.removeWithAssociatedData(LIVE_EVENT_ID, LIVE_USER_ID),
      ).resolves.toEqual(grant);

      expect(redisMock.redis.multi).toHaveBeenCalledTimes(1);
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

      await expect(
        repository.removeWithAssociatedData(LIVE_EVENT_ID, LIVE_USER_ID),
      ).resolves.toBeNull();
      expect(redisMock.transaction.del).toHaveBeenCalledTimes(1);
    });

    it('throws when the transaction fails', async () => {
      redisMock.transaction.exec.mockResolvedValue(null);

      await expect(
        repository.removeWithAssociatedData(LIVE_EVENT_ID, LIVE_USER_ID),
      ).rejects.toThrow();
    });
  });
});
