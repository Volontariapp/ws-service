import { Inject, Injectable } from '@nestjs/common';
import {
  LIVE_ARRIVAL_FALLBACK_RADIUS_M,
  LIVE_CADENCE_REPOSITORY,
  LIVE_GRANT_REPOSITORY,
  LIVE_POSITION_REPOSITORY,
} from '../live.constants.js';
import { GeoPoint } from '../domain/geo-point.value-object.js';
import type { LivePositionCommandDTO } from '../dto/request/command/live-position.command.dto.js';
import type { ILiveCadenceRepository } from '../repositories/interfaces/live-cadence.repository.js';
import type { ILiveGrantRepository } from '../repositories/interfaces/live-grant.repository.js';
import type { ILivePositionRepository } from '../repositories/interfaces/live-position.repository.js';
import { LiveNotifierService } from './live-notifier.service.js';

/** Issue d'un message de position, sans coordonnee, pour que l'appelant puisse la journaliser. */
export type LivePositionResult =
  | { kind: 'REVOKED' }
  | { kind: 'THROTTLED' }
  | { kind: 'ARRIVED' }
  | { kind: 'ALREADY_STOPPED' }
  | { kind: 'FORWARDED' };

@Injectable()
export class LivePositionService {
  constructor(
    @Inject(LIVE_GRANT_REPOSITORY) private readonly grants: ILiveGrantRepository,
    @Inject(LIVE_CADENCE_REPOSITORY) private readonly cadence: ILiveCadenceRepository,
    @Inject(LIVE_POSITION_REPOSITORY) private readonly positions: ILivePositionRepository,
    private readonly notifier: LiveNotifierService,
  ) {}

  /** Etapes 1 a 5 de docs/live-events/04 section 7 : autorisation, cadence, arrondi, position, repli ou envoi. */
  async report(userId: string, command: LivePositionCommandDTO): Promise<LivePositionResult> {
    const { eventId } = command;

    const grant = await this.grants.find(eventId, userId);
    if (!grant) {
      await this.notifier.notifySharingStopped(userId, eventId, userId, 'REVOKED');
      return { kind: 'REVOKED' };
    }

    if (!(await this.cadence.tryAcquire(eventId, userId))) {
      return { kind: 'THROTTLED' };
    }

    const point = GeoPoint.create(command.latitude, command.longitude).rounded();
    const position = {
      latitude: point.latitude,
      longitude: point.longitude,
      updatedAt: new Date(Date.now()).toISOString(),
    };
    await this.positions.save(eventId, userId, position);

    if (point.distanceTo(grant.eventPoint) <= LIVE_ARRIVAL_FALLBACK_RADIUS_M) {
      return this.stopAsArrived(eventId, userId, grant.organizerId);
    }
    await this.notifier.notifyPositionUpdated(grant.organizerId, eventId, userId, position);
    return { kind: 'FORWARDED' };
  }

  private async stopAsArrived(
    eventId: string,
    userId: string,
    organizerId: string,
  ): Promise<LivePositionResult> {
    const removed = await this.grants.removeWithAssociatedData(eventId, userId);
    if (!removed) {
      // Une revocation concurrente a deja retire l'autorisation et notifie.
      return { kind: 'ALREADY_STOPPED' };
    }
    await this.notifier.notifySharingStopped(userId, eventId, userId, 'ARRIVED');
    await this.notifier.notifySharingStopped(organizerId, eventId, userId, 'ARRIVED');
    return { kind: 'ARRIVED' };
  }
}
