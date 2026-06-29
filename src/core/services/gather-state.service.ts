import { Injectable, Logger } from '@nestjs/common';
import { GatherStateRepository } from '../repositories/gather-state.repository.js';
import { EventStatus, GatherStateEntity, GatherEventState, GatherStateMetadata } from '@volontariapp/database';
import { AppConfigService } from '../../config/app-config.service.js';
import { EventMessagingType } from '@volontariapp/messaging';

export interface GatherUpdateResult<TKey extends EventMessagingType = EventMessagingType> {
  isComplete: boolean;
  isSuccess?: boolean;
  failedEvents?: string[];
  metadata?: GatherStateMetadata<TKey>;
  gatherStateId?: string;
}

@Injectable()
export class GatherStateService {
  private readonly logger = new Logger(GatherStateService.name);

  constructor(
    private readonly gatherStateRepository: GatherStateRepository,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Retourne la configuration d'agrégation associée à un trigger donné.
   */
  getAggregationConfig(trigger: string) {
    const aggregations = this.configService.scatterGather?.aggregations || [];
    const aggregation = aggregations.find((agg) => agg.trigger === trigger);

    if (!aggregation) {
      this.logger.warn(`No aggregation configuration found for trigger event: ${trigger}`);
      throw new Error(`No aggregation config for trigger: ${trigger}`);
    }
    return aggregation;
  }

  /**
   * Initialise l'état d'agrégation dans la base de données pour un correlationId donné.
   * On stocke également le payload initial (metadata) pour pouvoir l'utiliser lors de la complétion.
   */
  async initializeGatherState<TKey extends EventMessagingType>(
    correlationId: string,
    triggerEvent: TKey,
    metadata: GatherStateMetadata<TKey>,
  ): Promise<GatherStateEntity<TKey>> {
    const aggregation = this.getAggregationConfig(triggerEvent);

    // Construire la liste des événements attendus
    const gatherEventsState: Record<string, GatherEventState> = {};
    for (const expectedType of aggregation.expects) {
      gatherEventsState[expectedType] = {
        eventType: expectedType,
        status: EventStatus.PENDING,
        updatedAt: new Date().toISOString(),
      };
    }

    // Créer ou écraser l'état dans la table
    const existing = await this.gatherStateRepository.findOne({ correlationId });
    if (existing) {
      this.logger.log(
        `GatherState already exists for correlationId ${correlationId}, updating it.`,
      );
      const updated = await this.gatherStateRepository.update(existing.id, {
        triggerEvent,
        gatherEventsState,
        metadata,
      });
      if (!updated) {
        throw new Error(`Failed to update gather state for correlationId: ${correlationId}`);
      }
      return updated as GatherStateEntity<TKey>;
    }

    return (await this.gatherStateRepository.create({
      correlationId,
      triggerEvent,
      gatherEventsState,
      metadata,
    })) as GatherStateEntity<TKey>;
  }

  /**
   * Met à jour le statut d'un événement attendu.
   * Retourne un objet indiquant si l'agrégation est complète, et si oui, retourne les métadonnées et résultats.
   */
  async updateEventState<TKey extends EventMessagingType>(
    correlationId: string,
    expectedEvent: string,
    status: EventStatus,
    errorReason?: string,
  ): Promise<GatherUpdateResult<TKey>> {
    const gatherState = (await this.gatherStateRepository.findOne({ correlationId })) as GatherStateEntity<TKey> | null;
    if (!gatherState) {
      this.logger.debug(`No active gather state found for correlationId: ${correlationId}`);
      return { isComplete: false };
    }

    const gatherEventsState = { ...gatherState.gatherEventsState };

    // Vérifier si l'événement fait partie de l'agrégation
    if (!gatherEventsState[expectedEvent]) {
      this.logger.debug(
        `Event ${expectedEvent} is not expected for correlationId: ${correlationId}`,
      );
      return { isComplete: false };
    }

    // Mettre à jour l'événement attendu
    gatherEventsState[expectedEvent] = {
      ...gatherEventsState[expectedEvent],
      status,
      updatedAt: new Date().toISOString(),
      errorReason,
    };

    // Mettre à jour dans la base
    await this.gatherStateRepository.update(gatherState.id, {
      correlationId: gatherState.correlationId,
      gatherEventsState,
    });

    // Vérifier si tout est résolu (plus aucun PENDING)
    const aggregation = this.getAggregationConfig(gatherState.triggerEvent);
    if (!aggregation) {
      return { isComplete: false };
    }

    const isComplete = aggregation.expects.every(
      (expectedType) => gatherEventsState[expectedType]?.status !== EventStatus.PENDING,
    );

    if (isComplete) {
      const failedEvents = aggregation.expects.filter(
        (expectedType) => gatherEventsState[expectedType]?.status === EventStatus.FAILED,
      );
      const isSuccess = failedEvents.length === 0;

      return {
        isComplete: true,
        isSuccess,
        failedEvents,
        metadata: gatherState.metadata,
        gatherStateId: gatherState.id,
      };
    }

    return { isComplete: false };
  }
}
