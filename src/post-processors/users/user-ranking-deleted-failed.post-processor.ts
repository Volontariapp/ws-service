import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  RankingEventMessagingType,
  UserEventMessagingType,
  SagaGatherType,
} from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class UserRankingDeletedFailedPostProcessor extends BaseWebSocketGatherPostProcessor<
  RankingEventMessagingType.USER_RANKING_DELETION_FAILED,
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
      'USER_RANKING_DELETED',
      EventStatus.FAILED,
      SagaGatherType.USER_DELETION,
      true,
    );
  }

  protected override shouldProcess(eventType: RankingEventMessagingType | string): boolean {
    return eventType === RankingEventMessagingType.USER_RANKING_DELETION_FAILED.toString();
  }
}
