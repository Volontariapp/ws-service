import { BaseGatherPostProcessor } from '../base-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { PostEventMessagingType } from '@volontariapp/messaging';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class PostDeletedPostProcessor extends BaseGatherPostProcessor<
  PostEventMessagingType.POST_DELETED,
  PostEventMessagingType.POST_DELETED
> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    gatherStateService: GatherStateService,
  ) {
    super(redisClient, options, gatherStateService, PostEventMessagingType.POST_DELETED, true);
  }

  protected override shouldProcess(eventType: PostEventMessagingType | string): boolean {
    return eventType === PostEventMessagingType.POST_DELETED.toString();
  }

  protected override processGatherResult(): void {}
}
