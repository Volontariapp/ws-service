import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  StorageEventMessagingType,
  UserEventMessagingType,
  SagaGatherType,
} from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class UserStorageDeletedFailedPostProcessor extends BaseWebSocketGatherPostProcessor<
  StorageEventMessagingType.USER_STORAGE_DELETION_FAILED,
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
      'USER_STORAGE_DELETED',
      EventStatus.FAILED,
      SagaGatherType.USER_DELETION,
      true,
    );
  }

  protected override shouldProcess(eventType: StorageEventMessagingType | string): boolean {
    return eventType === StorageEventMessagingType.USER_STORAGE_DELETION_FAILED.toString();
  }
}
