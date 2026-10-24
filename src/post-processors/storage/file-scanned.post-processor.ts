import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { StorageEventMessagingType, StorageWebsocketMessagingType } from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';

@Injectable()
export class FileScannedPostProcessor extends BatchPostProcessor<StorageEventMessagingType.FILE_SCANNED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: StorageEventMessagingType | string): boolean {
    return eventType === StorageEventMessagingType.FILE_SCANNED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<StorageEventMessagingType.FILE_SCANNED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing FILE_SCANNED notification', {
          messageId,
          eventId: event.id,
        });

        const payload = event.payload.after;
        const targetUserId = payload.ownerId || event.emitterId;

        if (!targetUserId) {
          this.logger.warn(
            'No target ownerId or emitterId found for FILE_SCANNED, skipping notification',
            { messageId, eventId: event.id },
          );
          return;
        }

        await this.notificationService.notifyUser(
          targetUserId,
          StorageWebsocketMessagingType.FILE_SCANNED,
          {
            fileId: payload.fileId,
            entityType: payload.entityType,
            entityId: payload.entityId,
            ownerId: payload.ownerId,
          },
        );

        this.logger.info(`Dispatched FILE_SCANNED websocket notification to user ${targetUserId}`, {
          messageId,
          eventId: event.id,
          fileId: payload.fileId,
        });
      }),
    );
  }
}
