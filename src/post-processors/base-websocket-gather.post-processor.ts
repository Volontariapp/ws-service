import { BaseGatherPostProcessor } from './base-gather.post-processor.js';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import type { EventMessagingType, WebsocketEventRegistry } from '@volontariapp/messaging';
import { getWsEventForEvent } from '@volontariapp/messaging';
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

    const { eventId, postId, userId } = this.extractPayloadIds(metadata.payload);
    const wsPayload = result.isSuccess
      ? metadata.payload
      : {
          ...(eventId ? { eventId } : {}),
          ...(postId ? { postId } : {}),
          ...(userId ? { userId } : {}),
          failedEvents: result.failedEvents,
        };

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
}
