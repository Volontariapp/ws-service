import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import {
  EventEventMessagingType,
  WebsocketMessagingType,
  IEventCreatedWebsocketPayload,
} from '@volontariapp/messaging';
import { NotificationService } from '../../gateways/notification.service.js';
import { GatherStateService } from '../../core/services/gather-state.service.js';
import { EventStatus, EventQueueModel } from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { AppDataSource } from '../../config/data-source.js';
import { Streams } from '@volontariapp/shared';

@Injectable()
export class GeocodedSuccessPostProcessor extends BatchPostProcessor<EventEventMessagingType.EVENT_GEOCODED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
    private readonly gatherStateService: GatherStateService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: EventEventMessagingType | string): boolean {
    return eventType === EventEventMessagingType.EVENT_GEOCODED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<EventEventMessagingType.EVENT_GEOCODED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Processing geocoded feedback event', {
          messageId,
          eventId: event.payload.after.eventId,
          correlationId: event.correlationId,
        });

        // Mettre à jour l'état de l'agrégation
        const result = await this.gatherStateService.updateEventState<EventEventMessagingType.EVENT_CREATED>(
          event.correlationId,
          'GEOCODED_SUCCESS',
          EventStatus.SUCCESS,
        );

        if (result.isComplete && result.metadata) {
          const metadata = result.metadata;
          const payload = metadata.payload as unknown as IEventCreatedWebsocketPayload;

          this.logger.info('Scatter-Gather complete! Sending WebSocket notifications.', {
            correlationId: event.correlationId,
            eventId: payload.eventId,
          });

          // 1. Envoyer les WebSockets
          if (metadata.emitterId) {
            this.notificationService.broadcastExcept(
              metadata.emitterId,
              WebsocketMessagingType.EVENT_CREATED,
              payload,
            );
            await this.notificationService.notifyUser(
              metadata.emitterId,
              WebsocketMessagingType.EVENT_CREATED,
              payload,
            );
          } else {
            this.notificationService.broadcast(WebsocketMessagingType.EVENT_CREATED, payload);
          }

          // 2. Écrire le feedback de succès dans l'outbox
          const repo = new EventQueueRepository(AppDataSource.getRepository(EventQueueModel));
          await repo.create({
            type: EventEventMessagingType.EVENT_CREATION_SUCCESSFULL,
            emitter: 'ws-service',
            emitterId: metadata.emitterId,
            traceId: metadata.traceId,
            correlationId: event.correlationId,
            version: 1,
            payload: {
              before: undefined,
              after: {
                eventId: payload.eventId,
                userId: metadata.emitterId ?? null,
              },
            },
            targetServices: [Streams.EVENT_SUCCESSFULLY_CREATED],
          });

          this.logger.info('Feedback event EVENT_CREATION_SUCCESSFULL registered in outbox.', {
            correlationId: event.correlationId,
            eventId: payload.eventId,
          });
        }
      }),
    );
  }
}
