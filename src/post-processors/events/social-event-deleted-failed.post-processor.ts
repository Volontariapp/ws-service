import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  SocialEventMessagingType,
  EventEventMessagingType,
  SagaGatherType,
} from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class SocialEventDeletedFailedPostProcessor extends BaseWebSocketGatherPostProcessor<
  SocialEventMessagingType.EVENT_SOCIAL_DELETION_FAILED,
  EventEventMessagingType.EVENT_DELETED
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
      EventEventMessagingType.EVENT_DELETED,
      'EVENT_SOCIAL_DELETED',
      EventStatus.FAILED,
      SagaGatherType.EVENT_DELETION,
    );
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.EVENT_SOCIAL_DELETION_FAILED.toString();
  }
}
