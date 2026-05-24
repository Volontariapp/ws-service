import { SinglePostProcessor } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  IUserCreatedWebsocketPayload,
  WebsocketEventMessagingType,
  type StreamEvent,
} from '@volontariapp/messaging';
import { SocketManagerService } from '../core/services/socket-manager.service.js';
import { NotificationService } from '../gateways/notification.service.js';

@Injectable()
export class UserCreatedPostProcessor extends SinglePostProcessor<WebsocketEventMessagingType.WS_USER_CREATED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly socketManager: SocketManagerService,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: WebsocketEventMessagingType | string): boolean {
    return eventType === WebsocketEventMessagingType.WS_USER_CREATED.toString();
  }

  protected async processEvent(
    event: StreamEvent<IUserCreatedWebsocketPayload>,
    messageId: string,
  ): Promise<void> {
    this.logger.info('Processing WS_USER_CREATED', {
      messageId,
      eventId: event.id,
    });

    const payload = event.payload.after;

    await this.socketManager.trackUser(payload.id);
    this.notificationService.notifyUser(
      payload.id,
      WebsocketEventMessagingType.WS_USER_CREATED,
      payload,
    );
  }
}
