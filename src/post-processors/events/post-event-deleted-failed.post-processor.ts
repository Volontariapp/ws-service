import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  PostEventMessagingType,
  EventEventMessagingType,
} from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class PostEventDeletedFailedPostProcessor extends BaseWebSocketGatherPostProcessor<
  PostEventMessagingType.POST_EVENT_DELETED_FAILED,
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
      'post_event.deleted_success',
      EventStatus.FAILED,
    );
  }

  protected override shouldProcess(eventType: PostEventMessagingType | string): boolean {
    return eventType === PostEventMessagingType.POST_EVENT_DELETED_FAILED.toString();
  }
}
