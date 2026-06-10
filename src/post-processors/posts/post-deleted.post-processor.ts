import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  IPostDeletedWebsocketPayload,
  SocialEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';

@Injectable()
export class PostDeletedPostProcessor extends BatchPostProcessor<SocialEventMessagingType.POST_SOCIAL_DELETED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.POST_SOCIAL_DELETED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<SocialEventMessagingType.POST_SOCIAL_DELETED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing WS_POST_DELETED feedback', {
          messageId,
          eventId: event.id,
        });

        const payload = event.payload.after;
        if (!event.emitterId) {
          this.logger.warn('No emitterId found for WS_POST_DELETED, skipping notifications', {
            messageId,
          });
          return;
        }

        const isEmitterPayload: IPostDeletedWebsocketPayload = { isEmitter: true, ...payload };
        const othersPayload: IPostDeletedWebsocketPayload = { isEmitter: false, ...payload };

        this.notificationService.broadcastExcept(
          event.emitterId,
          WebsocketMessagingType.POST_DELETED,
          othersPayload,
        );

        await this.notificationService.notifyUser(
          event.emitterId,
          WebsocketMessagingType.POST_DELETED,
          isEmitterPayload,
        );
      }),
    );
  }
}
