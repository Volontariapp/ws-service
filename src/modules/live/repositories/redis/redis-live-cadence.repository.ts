import { Inject, Injectable } from '@nestjs/common';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import type { RedisProvider } from '@volontariapp/bridge';
import { LIVE_MIN_UPDATE_INTERVAL_MS } from '../../live.constants.js';
import type { ILiveCadenceRepository } from '../interfaces/live-cadence.repository.js';
import { liveRateKey } from './live-redis-keys.js';

@Injectable()
export class RedisLiveCadenceRepository implements ILiveCadenceRepository {
  constructor(@Inject(NestRedisProvider) private readonly redisProvider: RedisProvider) {}

  async tryAcquire(eventId: string, userId: string): Promise<boolean> {
    const result = await this.redisProvider
      .getDriver()
      .set(liveRateKey(eventId, userId), '1', 'PX', LIVE_MIN_UPDATE_INTERVAL_MS, 'NX');
    return result === 'OK';
  }
}
