import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LIVE_MIN_UPDATE_INTERVAL_MS } from '../../../../../../modules/live/live.constants.js';
import { RedisLiveCadenceRepository } from '../../../../../../modules/live/repositories/redis/redis-live-cadence.repository.js';
import { LIVE_EVENT_ID, LIVE_USER_ID } from '../../../../../helpers/factories/live.factory.js';
import {
  createRedisProviderMock,
  type RedisProviderMock,
} from '../../../../../helpers/mocks/redis-provider.mock.js';

describe('RedisLiveCadenceRepository (Unit)', () => {
  let redisMock: RedisProviderMock;
  let repository: RedisLiveCadenceRepository;

  beforeEach(() => {
    redisMock = createRedisProviderMock();
    repository = new RedisLiveCadenceRepository(redisMock.provider);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets live:rate with NX and a 10 s expiry and returns true when acquired', async () => {
    redisMock.redis.set.mockResolvedValue('OK');

    await expect(repository.tryAcquire(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBe(true);
    expect(redisMock.redis.set.mock.calls).toEqual([
      ['live:rate:event-1:user-1', '1', 'PX', LIVE_MIN_UPDATE_INTERVAL_MS, 'NX'],
    ]);
  });

  it('returns false when the slot is already taken', async () => {
    redisMock.redis.set.mockResolvedValue(null);

    await expect(repository.tryAcquire(LIVE_EVENT_ID, LIVE_USER_ID)).resolves.toBe(false);
  });
});
