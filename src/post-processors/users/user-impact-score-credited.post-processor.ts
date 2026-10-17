import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { UserEventMessagingType, WebsocketMessagingType } from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';

/**
 * Push direct vers l'utilisateur dont le score d'impact vient d'etre credite.
 * Un seul producteur et un seul destinataire par message : pas de scatter-gather.
 */
@Injectable()
export class UserImpactScoreCreditedPostProcessor extends BatchPostProcessor<UserEventMessagingType.USER_IMPACT_SCORE_CREDITED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: UserEventMessagingType | string): boolean {
    return eventType === UserEventMessagingType.USER_IMPACT_SCORE_CREDITED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<UserEventMessagingType.USER_IMPACT_SCORE_CREDITED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        const { userId, eventId, scoreIncrement } = event.payload.after;

        if (!userId) {
          this.logger.warn(
            'No target userId for USER_IMPACT_SCORE_CREDITED, skipping notification',
            {
              messageId,
              eventId: event.id,
            },
          );
          return;
        }

        await this.notificationService.notifyUser(
          userId,
          WebsocketMessagingType.USER_IMPACT_SCORE_CREDITED,
          { eventId, scoreIncrement },
        );

        this.logger.info(
          `Dispatched USER_IMPACT_SCORE_CREDITED websocket notification to user ${userId}`,
          { messageId, eventId: event.id, scoreIncrement },
        );
      }),
    );
  }
}
