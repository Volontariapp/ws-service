import { BaseGatherCreatorPostProcessor } from '../base-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { UserEventMessagingType } from '@volontariapp/messaging';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class UserCreatedPostProcessor extends BaseGatherCreatorPostProcessor<
  UserEventMessagingType.USER_CREATED,
  UserEventMessagingType.USER_CREATED
> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    gatherStateService: GatherStateService,
  ) {
    super(redisClient, options, gatherStateService, UserEventMessagingType.USER_CREATED, true);
  }

  protected override shouldProcess(eventType: UserEventMessagingType | string): boolean {
    return eventType === UserEventMessagingType.USER_CREATED.toString();
  }

  protected override processGatherResult(): void {}
}
