import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { SocialEventMessagingType, UserEventMessagingType, SagaGatherType } from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class UserSocialCreatedPostProcessor extends BaseWebSocketGatherPostProcessor<
  SocialEventMessagingType.USER_SOCIAL_CREATED,
  UserEventMessagingType.USER_CREATED
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
      UserEventMessagingType.USER_CREATED,
      'USER_SOCIAL_CREATED',
      EventStatus.SUCCESS,
      SagaGatherType.USER_CREATION,
    );
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.USER_SOCIAL_CREATED.toString();
  }
}
