import { BaseGatherPostProcessor } from '../base-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { UserEventMessagingType } from '@volontariapp/messaging';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class UserDeletedPostProcessor extends BaseGatherPostProcessor<
  UserEventMessagingType.USER_DELETED,
  UserEventMessagingType.USER_DELETED
> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    gatherStateService: GatherStateService,
  ) {
    super(redisClient, options, gatherStateService, UserEventMessagingType.USER_DELETED, true);
  }

  protected override shouldProcess(eventType: UserEventMessagingType | string): boolean {
    return eventType === UserEventMessagingType.USER_DELETED.toString();
  }

  protected override processGatherResult(): void {}
}
