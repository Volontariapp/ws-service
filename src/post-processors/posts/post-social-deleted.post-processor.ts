import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { SocialEventMessagingType, PostEventMessagingType, SagaGatherType } from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class PostSocialDeletedPostProcessor extends BaseWebSocketGatherPostProcessor<
  SocialEventMessagingType.POST_SOCIAL_DELETED,
  PostEventMessagingType.POST_DELETED
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
      PostEventMessagingType.POST_DELETED,
      'POST_SOCIAL_DELETED',
      EventStatus.SUCCESS,
      SagaGatherType.POST_DELETION,
    );
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.POST_SOCIAL_DELETED.toString();
  }
}
