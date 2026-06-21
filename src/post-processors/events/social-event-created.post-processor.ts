import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  IEventCreatedWebsocketPayload,
  SocialEventMessagingType,
  WebsocketMessagingType,
  EventEventMessagingType,
} from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';
import { AppDataSource } from '../../config/data-source.js';
import { databaseMapper, EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import { Streams } from '@volontariapp/shared';
import { EventQueueRepository } from '@volontariapp/outbox';

databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);

@Injectable()
export class SocialEventCreatedPostProcessor extends BatchPostProcessor<SocialEventMessagingType.EVENT_SOCIAL_CREATED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: SocialEventMessagingType | string): boolean {
    return eventType === SocialEventMessagingType.EVENT_SOCIAL_CREATED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<SocialEventMessagingType.EVENT_SOCIAL_CREATED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        await Promise.resolve();
        this.logger.info('Processing WS_EVENT_CREATED', {
          messageId,
          eventId: event.id,
        });

        const payload: IEventCreatedWebsocketPayload = event.payload.after;

        if (event.emitterId) {
          this.notificationService.broadcastExcept(
            event.emitterId,
            WebsocketMessagingType.EVENT_CREATED,
            payload,
          );
          await this.notificationService.notifyUser(
            event.emitterId,
            WebsocketMessagingType.EVENT_CREATED,
            payload,
          );
        } else {
          this.notificationService.broadcast(WebsocketMessagingType.EVENT_CREATED, payload);
        }

        const eventId = payload.eventId;
        const repo = new EventQueueRepository(AppDataSource.getRepository(EventQueueModel));

        const afterPayload = {
          eventId,
          userId: event.emitterId,
        };

        await repo.create({
          type: EventEventMessagingType.EVENT_CREATION_SUCCESSFULL,
          emitter: 'ws-service',
          emitterId: event.emitterId,
          traceId: event.traceId,
          correlationId: event.correlationId,
          version: 1,
          payload: {
            before: undefined,
            after: afterPayload,
          },
          targetServices: [Streams.EVENT_SUCCESSFULLY_CREATED],
        });
        this.logger.info('Feedback event added to database event_queue', {
          eventId,
          type: EventEventMessagingType.EVENT_CREATION_SUCCESSFULL,
        });
      }),
    );
  }
}
