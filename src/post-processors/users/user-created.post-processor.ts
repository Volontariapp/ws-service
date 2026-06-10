import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  IUserCreatedWebsocketPayload,
  SocialEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { SocketManagerService } from '../../core/services/socket-manager.service.js';
import { NotificationService } from '../../gateways/notification.service.js';

@Injectable()
export class UserCreatedPostProcessor extends BatchPostProcessor<SocialEventMessagingType.USER_SOCIAL_CREATED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly socketManager: SocketManagerService,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.USER_SOCIAL_CREATED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<SocialEventMessagingType.USER_SOCIAL_CREATED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing WS_USER_CREATED', {
          messageId,
          eventId: event.id,
        });

        const payload: IUserCreatedWebsocketPayload = event.payload.after;
        if (payload.userId) {
          await this.socketManager.trackUser(payload.userId);
          await this.notificationService.notifyUser(
            payload.userId,
            WebsocketMessagingType.USER_CREATED,
            payload,
          );
        }

        await this.socketManager.trackUser(event.emitterId);
        await this.notificationService.notifyUser(
          event.emitterId,
          WebsocketMessagingType.USER_CREATED,
          payload,
        );
      }),
    );
  }
}
