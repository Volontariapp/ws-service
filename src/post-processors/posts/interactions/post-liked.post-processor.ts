import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  IPostLikedWebsocketPayload,
  PostEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { NotificationService } from '../../../gateways/notification.service.js';

@Injectable()
export class PostLikedPostProcessor extends BatchPostProcessor<PostEventMessagingType.POST_LIKED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: PostEventMessagingType | string): boolean {
    return eventType === PostEventMessagingType.POST_LIKED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<PostEventMessagingType.POST_LIKED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing POST_LIKED feedback', {
          messageId,
          eventId: event.id,
        });

        const payload = event.payload.after;
        if (!event.emitterId) {
          this.logger.warn('No emitterId found for POST_LIKED, skipping notifications', {
            messageId,
          });
          return;
        }

        const isEmitterPayload: IPostLikedWebsocketPayload = { isEmitter: true, ...payload };
        const othersPayload: IPostLikedWebsocketPayload = { isEmitter: false, ...payload };

        this.notificationService.broadcastExcept(
          event.emitterId,
          WebsocketMessagingType.POST_LIKED,
          othersPayload,
        );

        await this.notificationService.notifyUser(
          event.emitterId,
          WebsocketMessagingType.POST_LIKED,
          isEmitterPayload,
        );
      }),
    );
  }
}
