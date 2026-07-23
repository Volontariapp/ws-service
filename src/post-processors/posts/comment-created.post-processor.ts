import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  ICommentCreatedWebsocketPayload,
  PostEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';

@Injectable()
export class CommentCreatedPostProcessor extends BatchPostProcessor<PostEventMessagingType.COMMENT_CREATED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: PostEventMessagingType | string): boolean {
    return eventType === PostEventMessagingType.COMMENT_CREATED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<PostEventMessagingType.COMMENT_CREATED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing COMMENT_CREATED feedback', {
          messageId,
          eventId: event.id,
        });

        const payload = event.payload.after;
        if (!event.emitterId) {
          this.logger.warn('No emitterId found for COMMENT_CREATED, skipping notifications', {
            messageId,
          });
          return;
        }

        const isEmitterPayload: ICommentCreatedWebsocketPayload = { isEmitter: true, ...payload };
        const othersPayload: ICommentCreatedWebsocketPayload = { isEmitter: false, ...payload };

        this.notificationService.broadcastExcept(
          event.emitterId,
          WebsocketMessagingType.COMMENT_CREATED,
          othersPayload,
        );

        await this.notificationService.notifyUser(
          event.emitterId,
          WebsocketMessagingType.COMMENT_CREATED,
          isEmitterPayload,
        );
      }),
    );
  }
}
