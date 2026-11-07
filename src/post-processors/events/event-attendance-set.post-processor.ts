import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { SocialEventMessagingType, WebsocketMessagingType } from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';

/**
 * Previent chaque inscrit pointe ou depointe par l'organisateur (push direct, sans gather :
 * un seul destinataire par message).
 */
@Injectable()
export class EventAttendanceSetPostProcessor extends BatchPostProcessor<SocialEventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET.toString();
  }

  protected async processEvents(
    events: BatchEventItem<SocialEventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        const { eventId, checkedUserIds, uncheckedUserIds } = event.payload.after;

        this.logger.info('Processing EVENT_SOCIAL_ATTENDANCE_SET notification', {
          messageId,
          eventId,
          checkedCount: checkedUserIds.length,
          uncheckedCount: uncheckedUserIds.length,
        });

        const notifications = [
          ...checkedUserIds.map((userId) => ({ userId, checked: true })),
          ...uncheckedUserIds.map((userId) => ({ userId, checked: false })),
        ];

        await Promise.all(
          notifications.map(async ({ userId, checked }) => {
            await this.notificationService.notifyUser(
              userId,
              WebsocketMessagingType.EVENT_ATTENDANCE_UPDATED,
              { eventId, checked },
            );
          }),
        );
      }),
    );
  }
}
