import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { RedisProvider } from '@volontariapp/bridge';
import type { ChainableCommander, Redis } from 'ioredis';

export interface RedisProviderMock {
  provider: jest.Mocked<RedisProvider>;
  redis: jest.Mocked<Redis>;
  transaction: jest.Mocked<ChainableCommander>;
}

/** Fournisseur Redis dont `multi()` renvoie une transaction chainable ; `exec` est a regler par test. */
export const createRedisProviderMock = (): RedisProviderMock => {
  const provider = createMock<RedisProvider>();
  const redis = createMock<Redis>();
  const transaction = createMock<ChainableCommander>();
  provider.getDriver.mockReturnValue(redis);
  redis.multi.mockReturnValue(transaction);
  transaction.get.mockReturnValue(transaction);
  transaction.del.mockReturnValue(transaction);
  return { provider, redis, transaction };
};
