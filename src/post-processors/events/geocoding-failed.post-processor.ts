import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { EventEventMessagingType, SagaGatherType } from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class GeocodingFailedPostProcessor extends BaseWebSocketGatherPostProcessor<
  EventEventMessagingType.EVENT_GEOCODING_FAILED,
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
      'GEOCODED_SUCCESS',
      EventStatus.FAILED,
      SagaGatherType.EVENT_CREATION,
    );
  }

  protected override shouldProcess(eventType: EventEventMessagingType | string): boolean {
    return eventType === EventEventMessagingType.EVENT_GEOCODING_FAILED.toString();
  }
}
