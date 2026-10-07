import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { UserEventMessagingType, WebsocketMessagingType } from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';

@Injectable()
export class UserBadgeAwardedPostProcessor extends BatchPostProcessor<UserEventMessagingType.USER_BADGE_AWARDED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: UserEventMessagingType | string): boolean {
    return eventType === UserEventMessagingType.USER_BADGE_AWARDED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<UserEventMessagingType.USER_BADGE_AWARDED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing USER_BADGE_AWARDED notification', {
          messageId,
          eventId: event.id,
        });

        const payload = event.payload.after;
        const targetUserId = payload.userId || event.emitterId;

        if (!targetUserId) {
          this.logger.warn(
            'No target userId or emitterId found for USER_BADGE_AWARDED, skipping notification',
            { messageId, eventId: event.id },
          );
          return;
        }

        if (payload.badges.length === 0) {
          this.logger.warn(
            `No badges found in USER_BADGE_AWARDED payload for user ${targetUserId}, skipping notification`,
            { messageId, eventId: event.id },
          );
          return;
        }

        await this.notificationService.notifyUser(
          targetUserId,
          WebsocketMessagingType.USER_BADGE_AWARDED,
          {
            badges: payload.badges,
          },
        );

        this.logger.info(
          `Dispatched USER_BADGE_AWARDED websocket notification to user ${targetUserId}`,
          {
            messageId,
            eventId: event.id,
            badgeCount: payload.badges.length,
          },
        );
      }),
    );
  }
}
