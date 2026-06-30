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
export class SocialEventCreatedPostProcessor extends BaseWebSocketGatherPostProcessor<
  SocialEventMessagingType.EVENT_SOCIAL_CREATED,
  EventEventMessagingType.EVENT_CREATED
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
      EventEventMessagingType.EVENT_CREATED,
      'SOCIAL_EVENT_CREATED',
      EventStatus.SUCCESS,
    );
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.EVENT_SOCIAL_CREATED.toString();
  }
}
