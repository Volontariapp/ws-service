import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import type { GatherStateMetadata } from '@volontariapp/database';
import { EventStatus, EventQueueModel, GatherStateModel } from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { AppDataSource } from '../config/data-source.js';
import { GatherStateRepository } from '../core/repositories/gather-state.repository.js';
import type {
  EventMessagingType,
  IEventIdPayload,
  IPostIdPayload,
  IUserIdPayload,
  IPostCreatedPayload,
  IPostDeletedPayload,
  IEventCreatedPayload,
  IEventDeletedPayload,
  IUserCreatedPayload,
  IUserDeleledPayload,
} from '@volontariapp/messaging';
import {
  PostEventMessagingType,
  EventEventMessagingType,
  UserEventMessagingType,
} from '@volontariapp/messaging';
import type { GatherStateService } from '../core/services/gather-state.service.js';
import { type GatherUpdateResult } from '../core/services/gather-state.service.js';
import { Streams } from '@volontariapp/shared';

export interface IGatherEventPayload {
  eventId: string;
  errorReason?: string;
  userId?: string;
}

export type GatherTriggerPayload =
  | IPostCreatedPayload
  | IPostDeletedPayload
  | IEventCreatedPayload
  | IEventDeletedPayload
  | IUserCreatedPayload
  | IUserDeleledPayload;

export interface ExtractedTriggerIds {
  eventId?: string;
  postId?: string;
  userId?: string;
}

export abstract class BaseGatherPostProcessor<
  TEvent extends EventMessagingType,
  TTrigger extends EventMessagingType = EventMessagingType,
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
    result: GatherUpdateResult<TTrigger>,
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
              payload: event.payload.after as GatherStateMetadata<TTrigger>['payload'],
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
            this.logger.warn(
              `expectedKey or eventStatus is missing for non-creator post-processor.`,
            );
            return;
          }

          const payload = event.payload.after as IGatherEventPayload;
          const errorReason =
            status === EventStatus.FAILED
              ? (payload.errorReason ?? 'Sub-event execution failed')
              : undefined;

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

  private async handleCompletion(
    correlationId: string,
    result: GatherUpdateResult<TTrigger>,
  ): Promise<void> {
    const aggregationConfig = this.gatherStateService.getAggregationConfig(this.triggerEvent);
    const metadata = result.metadata;
    const gatherStateId = result.gatherStateId;
    if (!metadata || !gatherStateId) {
      return;
    }

    try {
      await this.processGatherResult(metadata, result);
    } catch (err) {
      this.logger.error('Failed to dispatch feedback:', err);
    }

    await AppDataSource.transaction(async (entityManager) => {
      const transactionalGatherStateRepo = new GatherStateRepository(
        entityManager.getRepository(GatherStateModel),
      );
      const transactionalEventQueueRepo = new EventQueueRepository(
        entityManager.getRepository(EventQueueModel),
      );

      await transactionalGatherStateRepo.delete(gatherStateId);

      const { eventId, postId, userId } = this.extractPayloadIds(metadata.payload);

      const eventType = result.isSuccess
        ? aggregationConfig.successEvent
        : aggregationConfig.failureEvent;

      const targetServices = this.resolveTargetServices(result.isSuccess ?? false);

      await transactionalEventQueueRepo.create({
        type: eventType,
        emitter: 'ws-service',
        emitterId: metadata.emitterId,
        traceId: metadata.traceId,
        correlationId,
        version: 1,
        payload: {
          before: undefined,
          after: {
            ...(eventId ? { eventId } : {}),
            ...(postId ? { postId } : {}),
            userId: metadata.emitterId ?? userId ?? null,
            ...(result.isSuccess ? {} : { failedEvents: result.failedEvents ?? null }),
          },
        },
        targetServices,
      });
    });
  }

  protected extractPayloadIds(payload?: unknown): ExtractedTriggerIds {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const trigger = payload as Partial<
      IPostIdPayload & IEventIdPayload & IUserIdPayload & { id?: string }
    >;

    return {
      eventId: trigger.eventId,
      postId: trigger.postId,
      userId: trigger.userId ?? trigger.id,
    };
  }

  private resolveTargetServices(isSuccess: boolean): Streams[] {
    const trigger = this.triggerEvent;

    switch (trigger) {
      case PostEventMessagingType.POST_CREATED:
      case PostEventMessagingType.POST_DELETED:
        return isSuccess ? [Streams.POST_SUCCESSFULLY_CREATED] : [Streams.WS_POST_CREATED_FEEDBACK];

      case UserEventMessagingType.USER_CREATED:
      case UserEventMessagingType.USER_DELETED:
        return isSuccess ? [Streams.USER_CREATED] : [Streams.WS_USER_CREATED_FEEDBACK];

      case EventEventMessagingType.EVENT_CREATED:
      case EventEventMessagingType.EVENT_DELETED:
      default:
        return isSuccess
          ? [Streams.EVENT_SUCCESSFULLY_CREATED]
          : [Streams.WS_EVENT_CREATED_FEEDBACK];
    }
  }
}
