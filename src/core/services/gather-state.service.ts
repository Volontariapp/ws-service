import { Injectable, Logger } from '@nestjs/common';
import { GatherStateRepository } from '../repositories/gather-state.repository.js';
import { EventStatus, GatherStateEntity, GatherEventState, GatherStateMetadata } from '@volontariapp/database';
import { AppConfigService } from '../../config/app-config.service.js';
import { EventMessagingType } from '@volontariapp/messaging';

@Injectable()
export class GatherStateService {
  private readonly logger = new Logger(GatherStateService.name);

  constructor(
    private readonly gatherStateRepository: GatherStateRepository,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Initialise l'état d'agrégation dans la base de données pour un correlationId donné.
   * On stocke également le payload initial (metadata) pour pouvoir l'utiliser lors de la complétion.
   */
  async initializeGatherState<TKey extends EventMessagingType>(
    correlationId: string,
    triggerEvent: TKey,
    metadata: GatherStateMetadata<TKey>,
  ): Promise<GatherStateEntity<TKey>> {
    // 1. Trouver la config d'agrégation pour ce triggerEvent
    const aggregations = this.configService.scatterGather?.aggregations || [];
    const aggregation = aggregations.find((agg) => agg.trigger === triggerEvent);

    if (!aggregation) {
      this.logger.warn(`No aggregation configuration found for trigger event: ${triggerEvent}`);
      throw new Error(`No aggregation config for trigger: ${triggerEvent}`);
    }

    // 2. Construire la liste des événements attendus
    const gatherEventsState: Record<string, GatherEventState> = {};
    for (const expectedType of aggregation.expects) {
      gatherEventsState[expectedType] = {
        eventType: expectedType,
        status: EventStatus.PENDING,
        updatedAt: new Date().toISOString(),
      };
    }

    // 3. Créer ou écraser l'état dans la table
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
      return updated as unknown as GatherStateEntity<TKey>;
    }

    return (await this.gatherStateRepository.create({
      correlationId,
      triggerEvent,
      gatherEventsState,
      metadata,
    })) as unknown as GatherStateEntity<TKey>;
  }

  /**
   * Met à jour le statut d'un événement attendu.
   * Retourne un objet indiquant si l'agrégation est complète, et si oui, retourne les métadonnées de l'agrégation.
   */
  async updateEventState<TKey extends EventMessagingType>(
    correlationId: string,
    expectedEvent: string,
    status: EventStatus,
    errorReason?: string,
  ): Promise<{
    isComplete: boolean;
    metadata?: GatherStateMetadata<TKey>;
  }> {
    const gatherState = (await this.gatherStateRepository.findOne({ correlationId })) as unknown as GatherStateEntity<TKey> | null;
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

    // Vérifier si tout est au statut SUCCESS
    const aggregations = this.configService.scatterGather?.aggregations || [];
    const aggregation = aggregations.find((agg) => agg.trigger === gatherState.triggerEvent);
    if (!aggregation) {
      return { isComplete: false };
    }

    const allSuccessful = aggregation.expects.every(
      (expectedType) => gatherEventsState[expectedType]?.status === EventStatus.SUCCESS,
    );

    if (allSuccessful) {
      const metadata = gatherState.metadata;
      // Supprimer l'état d'agrégation puisqu'elle est terminée
      await this.gatherStateRepository.delete(gatherState.id);
      return {
        isComplete: true,
        metadata,
      };
    }

    return { isComplete: false };
  }
}
