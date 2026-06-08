import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { WebsocketEventMessagingType } from '@volontariapp/messaging';
import { NotificationService } from '../gateways/notification.service.js';

@Injectable()
export class PostDeletionFailedPostProcessor extends BatchPostProcessor<WebsocketEventMessagingType.WS_POST_DELETION_FAILED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: WebsocketEventMessagingType | string): boolean {
    return eventType === WebsocketEventMessagingType.WS_POST_DELETION_FAILED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<WebsocketEventMessagingType.WS_POST_DELETION_FAILED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing WS_POST_DELETION_FAILED feedback', {
          messageId,
          eventId: event.id,
        });

        const payload = event.payload;
        if (!event.emitterId) {
          this.logger.warn(
            'No emitterId found for WS_POST_DELETION_FAILED, skipping notifications',
            { messageId },
          );
          return;
        }

        const isEmitterPayload = { isEmitter: true, ...payload };

        await this.notificationService.notifyUser(
          event.emitterId,
          WebsocketEventMessagingType.WS_POST_DELETION_FAILED,
          isEmitterPayload,
        );
      }),
    );
  }
}
