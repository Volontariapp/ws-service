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
   * Returns the aggregation configuration associated with a given trigger event.
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
   * Initializes the aggregation state in the database for a given correlationId.
   * Also stores the initial trigger payload (metadata) to be reused upon completion.
   */
  async initializeGatherState<TKey extends EventMessagingType>(
    correlationId: string,
    triggerEvent: TKey,
    metadata: GatherStateMetadata<TKey>,
  ): Promise<GatherStateEntity<TKey>> {
    const aggregation = this.getAggregationConfig(triggerEvent);

    // Build the list of expected events
    const gatherEventsState: Record<string, GatherEventState> = {};
    for (const expectedType of aggregation.expects) {
      gatherEventsState[expectedType] = {
        eventType: expectedType,
        status: EventStatus.PENDING,
        updatedAt: new Date().toISOString(),
      };
    }

    // Create or overwrite the state in the table
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
   * Updates the status of an expected event.
   * Returns an object indicating if the aggregation is complete, and if so, returns the metadata and results.
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

    // Verify if the event is part of the aggregation
    if (!gatherEventsState[expectedEvent]) {
      this.logger.debug(
        `Event ${expectedEvent} is not expected for correlationId: ${correlationId}`,
      );
      return { isComplete: false };
    }

    // Update the expected event state
    gatherEventsState[expectedEvent] = {
      ...gatherEventsState[expectedEvent],
      status,
      updatedAt: new Date().toISOString(),
      errorReason,
    };

    // Save changes in the database
    await this.gatherStateRepository.update(gatherState.id, {
      correlationId: gatherState.correlationId,
      gatherEventsState,
    });

    // Check if all expected events are resolved (no longer PENDING)
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
