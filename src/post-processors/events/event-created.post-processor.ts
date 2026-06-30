import { BaseGatherPostProcessor } from '../base-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { EventEventMessagingType } from '@volontariapp/messaging';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class EventCreatedPostProcessor extends BaseGatherPostProcessor<
  EventEventMessagingType.EVENT_CREATED,
  EventEventMessagingType.EVENT_CREATED
> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    gatherStateService: GatherStateService,
  ) {
    super(
      redisClient,
      options,
      gatherStateService,
      EventEventMessagingType.EVENT_CREATED,
      true, // isCreator = true
    );
  }

  protected override shouldProcess(eventType: EventEventMessagingType | string): boolean {
    return eventType === EventEventMessagingType.EVENT_CREATED.toString();
  }

  protected override processGatherResult(): void {}
}
