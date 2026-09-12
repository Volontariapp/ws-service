import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { SocialEventMessagingType, PostEventMessagingType } from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class PostSocialCreatedPostProcessor extends BaseWebSocketGatherPostProcessor<
  SocialEventMessagingType.POST_SOCIAL_CREATED,
  PostEventMessagingType.POST_CREATED
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
      PostEventMessagingType.POST_CREATED,
      'POST_SOCIAL_CREATED',
      EventStatus.SUCCESS,
    );
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.POST_SOCIAL_CREATED.toString();
  }
}
