import {
  BaseGatherPostProcessor,
  type IGatherCompletionOutput,
} from './base-gather.post-processor.js';
import type { Streams } from '@volontariapp/shared';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import type { EventMessagingType, WebsocketEventRegistry } from '@volontariapp/messaging';
import {
  getWsEventForEvent,
  getGatherCompletionConfig,
  SagaGatherType,
} from '@volontariapp/messaging';
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
    protected readonly sagaGatherType: SagaGatherType,
    protected readonly isEmitterOnly: boolean = false,
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

    const triggerPayload = (metadata.payload ?? {}) as Record<string, unknown>;
    const wsPayload = result.isSuccess
      ? metadata.payload
      : { ...triggerPayload, failedEvents: result.failedEvents };

    const isTargetOnlyEmitter =
      this.isEmitterOnly || this.sagaGatherType === SagaGatherType.USER_DELETION;

    if (metadata.emitterId) {
      if (isTargetOnlyEmitter) {
        const isEmitterPayload = {
          ...(wsPayload as Record<string, unknown>),
          isEmitter: true,
        };
        await this.notificationService.notifyUser(
          metadata.emitterId,
          wsType,
          isEmitterPayload as WebsocketEventRegistry[typeof wsType],
        );
      } else {
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
      }
    } else if (!isTargetOnlyEmitter) {
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
    const config = getGatherCompletionConfig(this.sagaGatherType);

    return {
      targetServices: [config.stream as Streams],
      payload: {
        ...triggerPayload,
        userId: metadata.emitterId ?? null,
        ...(result.isSuccess ? {} : { failedEvents: result.failedEvents ?? null }),
      },
    };
  }
}
