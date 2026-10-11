import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  EventEventMessagingType,
  UserEventMessagingType,
  SagaGatherType,
} from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class UserEventDeletedPostProcessor extends BaseWebSocketGatherPostProcessor<
  EventEventMessagingType.USER_EVENT_DELETED,
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
      'USER_EVENT_DELETED',
      EventStatus.SUCCESS,
      SagaGatherType.USER_DELETION,
      true,
    );
  }

  protected override shouldProcess(eventType: EventEventMessagingType | string): boolean {
    return eventType === EventEventMessagingType.USER_EVENT_DELETED.toString();
  }
}
