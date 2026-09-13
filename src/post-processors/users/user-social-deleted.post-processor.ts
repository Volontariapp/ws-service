import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { SocialEventMessagingType, UserEventMessagingType } from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class UserSocialDeletedPostProcessor extends BaseWebSocketGatherPostProcessor<
  SocialEventMessagingType.USER_SOCIAL_DELETED,
  UserEventMessagingType.USER_DELETED
> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    notificationService: NotificationService,
    gatherStateService: GatherStateService,
  ) {
    super(
      redisClient,
      options,
      gatherStateService,
      notificationService,
      UserEventMessagingType.USER_DELETED,
      'USER_SOCIAL_DELETED',
      EventStatus.SUCCESS,
    );
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.USER_SOCIAL_DELETED.toString();
  }
}
