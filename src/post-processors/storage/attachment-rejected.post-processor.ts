import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { StorageEventMessagingType, StorageWebsocketMessagingType } from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';

@Injectable()
export class AttachmentRejectedPostProcessor extends BatchPostProcessor<StorageEventMessagingType.ATTACHMENT_REJECTED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: StorageEventMessagingType | string): boolean {
    return eventType === StorageEventMessagingType.ATTACHMENT_REJECTED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<StorageEventMessagingType.ATTACHMENT_REJECTED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing ATTACHMENT_REJECTED notification', {
          messageId,
          eventId: event.id,
        });

        const payload = event.payload.after;
        const targetUserId = event.emitterId;

        if (!targetUserId) {
          this.logger.warn(
            'No target emitterId found for ATTACHMENT_REJECTED, skipping notification',
            { messageId, eventId: event.id },
          );
          return;
        }

        await this.notificationService.notifyUser(
          targetUserId,
          StorageWebsocketMessagingType.ATTACHMENT_REJECTED,
          {
            fileId: payload.fileId,
            entityType: payload.entityType,
            entityId: payload.entityId,
            reason: payload.reason,
          },
        );

        this.logger.info(
          `Dispatched ATTACHMENT_REJECTED websocket notification to user ${targetUserId}`,
          {
            messageId,
            eventId: event.id,
            fileId: payload.fileId,
            reason: payload.reason,
          },
        );
      }),
    );
  }
}
