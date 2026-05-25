import { SinglePostProcessor } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  IEventCreatedWebsocketPayload,
  WebsocketEventMessagingType,
  type StreamEvent,
} from '@volontariapp/messaging';
import { NotificationService } from '../gateways/notification.service.js';

@Injectable()
export class EventCreatedPostProcessor extends SinglePostProcessor<WebsocketEventMessagingType.WS_EVENT_CREATED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: WebsocketEventMessagingType | string): boolean {
    return eventType === WebsocketEventMessagingType.WS_EVENT_CREATED.toString();
  }

  protected async processEvent(
    event: StreamEvent<IEventCreatedWebsocketPayload>,
    messageId: string,
  ): Promise<void> {
    await Promise.resolve();
    this.logger.info('Processing WS_EVENT_CREATED', {
      messageId,
      eventId: event.id,
    });

    const payload = event.payload.after;

    if (payload.organizerId) {
      this.notificationService.broadcastExcept(
        payload.organizerId,
        WebsocketEventMessagingType.WS_EVENT_CREATED,
        payload,
      );
      await this.notificationService.notifyUser(
        payload.organizerId,
        WebsocketEventMessagingType.WS_EVENT_CREATED,
        payload,
      );
    } else {
      this.notificationService.broadcast(WebsocketEventMessagingType.WS_EVENT_CREATED, payload);
    }
  }
}
