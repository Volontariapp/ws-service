import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import type { RedisProvider } from '@volontariapp/bridge';
import type { ILiveGrantRequest } from '@volontariapp/messaging';
import type { Redis } from 'ioredis';
import {
  LIVE_GRANT_MAX_DURATION_MS,
  LIVE_MIN_UPDATE_INTERVAL_MS,
  LIVE_POSITION_TTL_S,
  liveGrantKey,
  livePositionKey,
  liveRateKey,
} from './live.constants.js';
import type { LiveGrant, LiveStoredPosition } from './live.types.js';

const isLiveGrant = (value: unknown): value is LiveGrant => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['organizerId'] === 'string' &&
    typeof candidate['eventLatitude'] === 'number' &&
    typeof candidate['eventLongitude'] === 'number' &&
    typeof candidate['expiresAt'] === 'string'
  );
};

/** Logique Redis du partage de position : autorisation, derniere position, cadence. */
@Injectable()
export class LiveGrantService {
  private readonly logger = new Logger(LiveGrantService.name);

  private get redisClient(): Redis {
    return this.redisProvider.getDriver();
  }

  constructor(@Inject(NestRedisProvider) private readonly redisProvider: RedisProvider) {}

  /** Ecrit l'autorisation avec un TTL jusqu'a `expiresAt` ; refuse une expiration hors fenetre. */
  async grant(request: ILiveGrantRequest): Promise<void> {
    const now = Date.now();
    const expiresAtMs = Date.parse(request.expiresAt);
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= now) {
      throw new BadRequestException('expiresAt must be in the future');
    }
    if (expiresAtMs - now > LIVE_GRANT_MAX_DURATION_MS) {
      throw new BadRequestException('expiresAt must be at most 8 hours from now');
    }
    const ttlSeconds = Math.max(1, Math.ceil((expiresAtMs - now) / 1000));
    const grant: LiveGrant = {
      organizerId: request.organizerId,
      eventLatitude: request.eventLatitude,
      eventLongitude: request.eventLongitude,
      expiresAt: request.expiresAt,
    };
    await this.redisClient.set(
      liveGrantKey(request.eventId, request.userId),
      JSON.stringify(grant),
      'EX',
      ttlSeconds,
    );
    this.logger.log(
      `Live grant written for user ${request.userId} on event ${request.eventId} (ttl ${String(ttlSeconds)}s)`,
    );
  }

  /** Autorisation courante, ou null si absente ou illisible (echec ferme). */
  async getGrant(eventId: string, userId: string): Promise<LiveGrant | null> {
    const raw = await this.redisClient.get(liveGrantKey(eventId, userId));
    return this.parseGrant(raw);
  }

  /**
   * Supprime autorisation, derniere position et cle de cadence dans une transaction et renvoie
   * l'autorisation retiree (null si elle n'existait plus). La lecture et la suppression sont
   * atomiques : deux revocations concurrentes ne recoivent pas toutes les deux l'autorisation.
   */
  async revoke(eventId: string, userId: string): Promise<LiveGrant | null> {
    const grantKey = liveGrantKey(eventId, userId);
    const results = await this.redisClient
      .multi()
      .get(grantKey)
      .del(grantKey, livePositionKey(eventId, userId), liveRateKey(eventId, userId))
      .exec();
    const read = results?.[0];
    if (!read || read[0] !== null) {
      throw new Error(`Live grant revocation failed for user ${userId} on event ${eventId}`);
    }
    return this.parseGrant(typeof read[1] === 'string' ? read[1] : null);
  }

  /** Reserve le droit d'accepter une position ; faux si la derniere date de moins de 10 s. */
  async acquireCadenceSlot(eventId: string, userId: string): Promise<boolean> {
    const result = await this.redisClient.set(
      liveRateKey(eventId, userId),
      '1',
      'PX',
      LIVE_MIN_UPDATE_INTERVAL_MS,
      'NX',
    );
    return result === 'OK';
  }

  async storePosition(
    eventId: string,
    userId: string,
    position: LiveStoredPosition,
  ): Promise<void> {
    await this.redisClient.set(
      livePositionKey(eventId, userId),
      JSON.stringify(position),
      'EX',
      LIVE_POSITION_TTL_S,
    );
  }

  private parseGrant(raw: string | null): LiveGrant | null {
    if (raw === null) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isLiveGrant(parsed)) {
        return parsed;
      }
    } catch {
      // valeur illisible : traitee comme absente
    }
    this.logger.warn('Ignoring an unreadable live grant value');
    return null;
  }
}
