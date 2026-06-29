import { BaseGatherPostProcessor } from './base-gather.post-processor.js';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  EventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { EventStatus, GatherStateMetadata } from '@volontariapp/database';
import { NotificationService } from '../gateways/notification.service.js';
import { GatherStateService, type GatherUpdateResult } from '../core/services/gather-state.service.js';

export abstract class BaseWebSocketGatherPostProcessor<
  TEvent extends EventMessagingType,
  TTrigger extends EventMessagingType = EventMessagingType
> extends BaseGatherPostProcessor<TEvent, TTrigger> {
  protected abstract readonly wsSuccessType: WebsocketMessagingType;
  protected abstract readonly wsFailureType: WebsocketMessagingType;

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
    result: GatherUpdateResult<TTrigger>
  ): Promise<void> {
    const wsType = result.isSuccess ? this.wsSuccessType : this.wsFailureType;
    const wsPayload = result.isSuccess
      ? metadata.payload
      : { eventId: (metadata.payload as any)!.eventId, failedEvents: result.failedEvents };

    if (metadata.emitterId) {
      if (result.isSuccess) {
        this.notificationService.broadcastExcept(
          metadata.emitterId,
          wsType,
          metadata.payload as any,
        );
      }
      await this.notificationService.notifyUser(
        metadata.emitterId,
        wsType,
        wsPayload as any,
      );
    } else {
      this.notificationService.broadcast(wsType, wsPayload as any);
    }
  }
}
