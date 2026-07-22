import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  SocialEventMessagingType,
  EventEventMessagingType,
} from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class SocialEventDeletedSuccessPostProcessor extends BaseWebSocketGatherPostProcessor<
  SocialEventMessagingType.SOCIAL_EVENT_DELETED_SUCCESS,
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
      'social_event.deleted_success',
      EventStatus.SUCCESS,
    );
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.SOCIAL_EVENT_DELETED_SUCCESS.toString();
  }
}
