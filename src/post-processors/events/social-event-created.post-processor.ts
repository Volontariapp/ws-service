import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  IEventCreatedWebsocketPayload,
  SocialEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';

@Injectable()
export class SocialEventCreatedPostProcessor extends BatchPostProcessor<SocialEventMessagingType.EVENT_SOCIAL_CREATED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.EVENT_SOCIAL_CREATED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<SocialEventMessagingType.EVENT_SOCIAL_CREATED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        await Promise.resolve();
        this.logger.info('Processing WS_EVENT_CREATED', {
          messageId,
          eventId: event.id,
        });

        const payload: IEventCreatedWebsocketPayload = event.payload.after;

        if (event.emitterId) {
          this.notificationService.broadcastExcept(
            event.emitterId,
            WebsocketMessagingType.EVENT_CREATED,
            payload,
          );
          await this.notificationService.notifyUser(
            event.emitterId,
            WebsocketMessagingType.EVENT_CREATED,
            payload,
          );
        } else {
          this.notificationService.broadcast(WebsocketMessagingType.EVENT_CREATED, payload);
        }
      }),
    );
  }
}
