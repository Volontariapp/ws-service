import { Inject, Injectable } from '@nestjs/common';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import type { RedisProvider } from '@volontariapp/bridge';
import { LIVE_POSITION_TTL_S } from '../../live.constants.js';
import type { LiveStoredPosition } from '../../domain/live-stored-position.js';
import type { ILivePositionRepository } from '../interfaces/live-position.repository.js';
import { livePositionKey } from './live-redis-keys.js';

@Injectable()
export class RedisLivePositionRepository implements ILivePositionRepository {
  constructor(@Inject(NestRedisProvider) private readonly redisProvider: RedisProvider) {}

  async save(eventId: string, userId: string, position: LiveStoredPosition): Promise<void> {
    await this.redisProvider
      .getDriver()
      .set(livePositionKey(eventId, userId), JSON.stringify(position), 'EX', LIVE_POSITION_TTL_S);
  }
}
