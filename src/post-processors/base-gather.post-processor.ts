import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  EventStatus,
  EventQueueModel,
  GatherStateModel,
  GatherStateMetadata,
} from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { AppDataSource } from '../config/data-source.js';
import { GatherStateRepository } from '../core/repositories/gather-state.repository.js';
import {
  EventMessagingType,
  EventRegistry,
} from '@volontariapp/messaging';
import { GatherStateService, type GatherUpdateResult } from '../core/services/gather-state.service.js';
import { Streams } from '@volontariapp/shared';

export interface IGatherEventPayload {
  eventId: string;
  errorReason?: string;
  userId?: string;
}

export abstract class BaseGatherPostProcessor<
  TEvent extends EventMessagingType,
  TTrigger extends EventMessagingType = EventMessagingType
> extends BatchPostProcessor<TEvent> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    protected readonly gatherStateService: GatherStateService,
    protected readonly triggerEvent: TTrigger,
    protected readonly isCreator: boolean,
    protected readonly expectedKey?: string,
    protected readonly eventStatus?: EventStatus,
  ) {
    super(redisClient, options);
  }

  protected abstract processGatherResult(
    metadata: GatherStateMetadata<TTrigger>,
    result: GatherUpdateResult<TTrigger>
  ): Promise<void> | void;

  protected async processEvents(events: BatchEventItem<TEvent>[]): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        if (this.isCreator) {
          this.logger.info(`Initializing gather state for trigger event ${event.type}`, {
            messageId,
            correlationId: event.correlationId,
          });
          await this.gatherStateService.initializeGatherState(
            event.correlationId,
            this.triggerEvent,
            {
              emitterId: event.emitterId,
              traceId: event.traceId,
              payload: event.payload.after as EventRegistry[TTrigger],
            },
          );
        } else {
          this.logger.info(`Processing gather update for event ${event.type}`, {
            messageId,
            correlationId: event.correlationId,
          });

          const expectedKey = this.expectedKey;
          const status = this.eventStatus;

          if (!expectedKey || status === undefined) {
            this.logger.warn(`expectedKey or eventStatus is missing for non-creator post-processor.`);
            return;
          }

          const payload = event.payload.after as IGatherEventPayload;
          const errorReason = status === EventStatus.FAILED ? payload?.errorReason || 'Sub-event execution failed' : undefined;

          const result = await this.gatherStateService.updateEventState<TTrigger>(
            event.correlationId,
            expectedKey,
            status,
            errorReason,
          );

          if (result.isComplete && result.metadata) {
            await this.handleCompletion(event.correlationId, result);
          }
        }
      }),
    );
  }

  private async handleCompletion(correlationId: string, result: GatherUpdateResult<TTrigger>): Promise<void> {
    const aggregationConfig = this.gatherStateService.getAggregationConfig(this.triggerEvent);

    try {
      await this.processGatherResult(result.metadata!, result);
    } catch (err) {
      this.logger.error('Failed to dispatch feedback:', err);
    }

    await AppDataSource.transaction(async (entityManager) => {
      const transactionalGatherStateRepo = new GatherStateRepository(
        entityManager.getRepository(GatherStateModel)
      );
      const transactionalEventQueueRepo = new EventQueueRepository(
        entityManager.getRepository(EventQueueModel)
      );

      await transactionalGatherStateRepo.delete(result.gatherStateId!);

      const triggerPayload = result.metadata!.payload as { eventId: string } | undefined;
      const eventId = triggerPayload?.eventId;

      const eventType = result.isSuccess ? aggregationConfig.successEvent : aggregationConfig.failureEvent;
      const payloadAfter: Record<string, any> = result.isSuccess
        ? { eventId, userId: result.metadata!.emitterId }
        : { eventId, failedEvents: result.failedEvents };

      await transactionalEventQueueRepo.create({
        type: eventType,
        emitter: 'ws-service',
        emitterId: result.metadata!.emitterId,
        traceId: result.metadata!.traceId,
        correlationId,
        version: 1,
        payload: { before: undefined, after: payloadAfter as any },
        targetServices: result.isSuccess ? [Streams.EVENT_SUCCESSFULLY_CREATED] : [Streams.EVENT_JOB_OUTBOX_FAILURE],
      });
    });
  }
}
