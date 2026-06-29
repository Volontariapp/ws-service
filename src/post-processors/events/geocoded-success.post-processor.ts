import { BaseWebSocketGatherPostProcessor } from '../base-websocket-gather.post-processor.js';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  EventEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { EventStatus } from '@volontariapp/database';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class GeocodedSuccessPostProcessor extends BaseWebSocketGatherPostProcessor<
  EventEventMessagingType.EVENT_GEOCODED,
  EventEventMessagingType.EVENT_CREATED
> {
  protected override readonly wsSuccessType = WebsocketMessagingType.EVENT_CREATED;
  protected override readonly wsFailureType = WebsocketMessagingType.EVENT_CREATION_FAILED;

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
      EventStatus.SUCCESS,
    );
  }

  protected override shouldProcess(eventType: EventEventMessagingType | string): boolean {
    return eventType === EventEventMessagingType.EVENT_GEOCODED.toString();
  }
}
