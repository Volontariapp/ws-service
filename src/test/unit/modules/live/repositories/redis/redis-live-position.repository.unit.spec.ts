import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LIVE_POSITION_TTL_S } from '../../../../../../modules/live/live.constants.js';
import { RedisLivePositionRepository } from '../../../../../../modules/live/repositories/redis/redis-live-position.repository.js';
import {
  LIVE_EVENT_ID,
  LIVE_USER_ID,
  createLiveStoredPosition,
} from '../../../../../helpers/factories/live.factory.js';
import {
  createRedisProviderMock,
  type RedisProviderMock,
} from '../../../../../helpers/mocks/redis-provider.mock.js';

describe('RedisLivePositionRepository (Unit)', () => {
  let redisMock: RedisProviderMock;
  let repository: RedisLivePositionRepository;

  beforeEach(() => {
    redisMock = createRedisProviderMock();
    repository = new RedisLivePositionRepository(redisMock.provider);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes the rounded position with a 120 s TTL', async () => {
    const position = createLiveStoredPosition();

    await repository.save(LIVE_EVENT_ID, LIVE_USER_ID, position);

    expect(redisMock.redis.set.mock.calls).toEqual([
      ['live:pos:event-1:user-1', JSON.stringify(position), 'EX', LIVE_POSITION_TTL_S],
    ]);
  });
});
