import { BaseGatherPostProcessor, type IGatherCompletionOutput } from './base-gather.post-processor.js';
import { Streams } from '@volontariapp/shared';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import type { EventMessagingType, WebsocketEventRegistry, SagaGatherType } from '@volontariapp/messaging';
import { getWsEventForEvent, getGatherCompletionConfig } from '@volontariapp/messaging';
import type { EventStatus, GatherStateMetadata } from '@volontariapp/database';
import type { NotificationService } from '../gateways/notification.service.js';
import type { GatherStateService } from '../core/services/gather-state.service.js';
import { type GatherUpdateResult } from '../core/services/gather-state.service.js';

export abstract class BaseWebSocketGatherPostProcessor<
  TEvent extends EventMessagingType,
  TTrigger extends EventMessagingType = EventMessagingType,
> extends BaseGatherPostProcessor<TEvent, TTrigger> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    gatherStateService: GatherStateService,
    protected readonly notificationService: NotificationService,
    triggerEvent: TTrigger,
    expectedKey: string,
    eventStatus: EventStatus,
    protected readonly sagaGatherType?: SagaGatherType,
  ) {
    super(redisClient, options, gatherStateService, triggerEvent, false, expectedKey, eventStatus);
  }

  protected async processGatherResult(
    metadata: GatherStateMetadata<TTrigger>,
    result: GatherUpdateResult<TTrigger>,
  ): Promise<void> {
    const aggregationConfig = this.gatherStateService.getAggregationConfig(this.triggerEvent);
    const eventType = result.isSuccess
      ? aggregationConfig.successEvent
      : aggregationConfig.failureEvent;
    const wsType = getWsEventForEvent(eventType);

    const triggerPayload = metadata.payload as { eventId: string };
    const wsPayload = result.isSuccess
      ? metadata.payload
      : { eventId: triggerPayload.eventId, failedEvents: result.failedEvents };

    if (metadata.emitterId) {
      if (result.isSuccess) {
        this.notificationService.broadcastExcept(
          metadata.emitterId,
          wsType,
          wsPayload as WebsocketEventRegistry[typeof wsType],
        );
      }
      await this.notificationService.notifyUser(
        metadata.emitterId,
        wsType,
        wsPayload as WebsocketEventRegistry[typeof wsType],
      );
    } else {
      this.notificationService.broadcast(
        wsType,
        wsPayload as WebsocketEventRegistry[typeof wsType],
      );
    }
  }

  protected buildCompletionOutput(
    result: GatherUpdateResult<TTrigger>,
    metadata: GatherStateMetadata<TTrigger>,
  ): IGatherCompletionOutput {
    const triggerPayload = (metadata.payload ?? {}) as Record<string, unknown>;

    let targetServices: Streams[];
    if (this.sagaGatherType) {
      const config = getGatherCompletionConfig(this.sagaGatherType);
      targetServices = [config.stream as Streams];
    } else {
      targetServices = result.isSuccess
        ? [Streams.EVENT_SUCCESSFULLY_CREATED]
        : [Streams.WS_EVENT_CREATED_FEEDBACK];
    }

    return {
      targetServices,
      payload: {
        ...triggerPayload,
        userId: metadata.emitterId ?? null,
        ...(result.isSuccess ? {} : { failedEvents: result.failedEvents ?? null }),
      },
    };
  }
}
