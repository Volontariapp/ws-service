import { Inject, Injectable, Logger } from '@nestjs/common';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import type { RedisProvider } from '@volontariapp/bridge';
import { LiveGrant } from '../../domain/live-grant.entity.js';
import type { ILiveGrantRepository } from '../interfaces/live-grant.repository.js';
import { liveGrantKey, livePositionKey, liveRateKey } from './live-redis-keys.js';

@Injectable()
export class RedisLiveGrantRepository implements ILiveGrantRepository {
  private readonly logger = new Logger(RedisLiveGrantRepository.name);

  constructor(@Inject(NestRedisProvider) private readonly redisProvider: RedisProvider) {}

  async save(eventId: string, userId: string, grant: LiveGrant, ttlSeconds: number): Promise<void> {
    await this.redisProvider
      .getDriver()
      .set(liveGrantKey(eventId, userId), grant.serialize(), 'EX', ttlSeconds);
  }

  async find(eventId: string, userId: string): Promise<LiveGrant | null> {
    const raw = await this.redisProvider.getDriver().get(liveGrantKey(eventId, userId));
    return this.parse(raw);
  }

  /**
   * Lecture et suppression dans une seule transaction MULTI : deux revocations concurrentes ne
   * recoivent pas toutes les deux l'autorisation.
   */
  async removeWithAssociatedData(eventId: string, userId: string): Promise<LiveGrant | null> {
    const grantKey = liveGrantKey(eventId, userId);
    const results = await this.redisProvider
      .getDriver()
      .multi()
      .get(grantKey)
      .del(grantKey, livePositionKey(eventId, userId), liveRateKey(eventId, userId))
      .exec();
    const read = results?.[0];
    if (!read || read[0] !== null) {
      throw new Error(`Live grant revocation failed for user ${userId} on event ${eventId}`);
    }
    return this.parse(typeof read[1] === 'string' ? read[1] : null);
  }

  private parse(raw: string | null): LiveGrant | null {
    if (raw === null) {
      return null;
    }
    const grant = LiveGrant.parse(raw);
    if (!grant) {
      this.logger.warn('Ignoring an unreadable live grant value');
    }
    return grant;
  }
}
