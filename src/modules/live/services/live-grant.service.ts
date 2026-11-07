import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { LIVE_GRANT_REPOSITORY } from '../live.constants.js';
import { GeoPoint } from '../domain/geo-point.value-object.js';
import { LiveGrant } from '../domain/live-grant.entity.js';
import type { PutLiveGrantCommandDTO } from '../dto/request/command/put-live-grant.command.dto.js';
import type { RevokeLiveGrantCommandDTO } from '../dto/request/command/revoke-live-grant.command.dto.js';
import type { ILiveGrantRepository } from '../repositories/interfaces/live-grant.repository.js';
import { LiveNotifierService } from './live-notifier.service.js';

@Injectable()
export class LiveGrantService {
  private readonly logger = new Logger(LiveGrantService.name);

  constructor(
    @Inject(LIVE_GRANT_REPOSITORY) private readonly grants: ILiveGrantRepository,
    private readonly notifier: LiveNotifierService,
  ) {}

  /** Ecrit l'autorisation avec un TTL jusqu'a `expiresAt` ; refuse une expiration hors fenetre. */
  async grant(command: PutLiveGrantCommandDTO): Promise<void> {
    const grant = new LiveGrant({
      organizerId: command.organizerId,
      eventPoint: GeoPoint.create(command.eventLatitude, command.eventLongitude),
      expiresAt: command.expiresAt,
    });
    const now = Date.now();
    const violation = grant.expiryViolation(now);
    if (violation) {
      throw new BadRequestException(violation);
    }
    const ttlSeconds = grant.ttlSeconds(now);
    await this.grants.save(command.eventId, command.userId, grant, ttlSeconds);
    this.logger.log(
      `Live grant written for user ${command.userId} on event ${command.eventId} (ttl ${String(ttlSeconds)}s)`,
    );
  }

  /** Retire l'autorisation et previent l'organisateur ; sans autorisation, rien a notifier. */
  async revoke(command: RevokeLiveGrantCommandDTO): Promise<void> {
    const { eventId, userId, reason } = command;
    const removed = await this.grants.removeWithAssociatedData(eventId, userId);
    if (!removed) {
      this.logger.log(`No live grant to remove for user ${userId} on event ${eventId}`);
      return;
    }
    await this.notifier.notifySharingStopped(removed.organizerId, eventId, userId, reason);
    this.logger.log(`Live sharing stopped for user ${userId} on event ${eventId}: ${reason}`);
  }
}
