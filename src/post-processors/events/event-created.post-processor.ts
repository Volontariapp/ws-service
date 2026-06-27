import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { EventEventMessagingType } from '@volontariapp/messaging';
import { GatherStateService } from '../../core/services/gather-state.service.js';

@Injectable()
export class EventCreatedPostProcessor extends BatchPostProcessor<EventEventMessagingType.EVENT_CREATED> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly gatherStateService: GatherStateService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: EventEventMessagingType | string): boolean {
    return eventType === EventEventMessagingType.EVENT_CREATED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<EventEventMessagingType.EVENT_CREATED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Initializing Scatter-Gather state for EVENT_CREATED', {
          messageId,
          eventId: event.payload.after.eventId,
          correlationId: event.correlationId,
        });

        // Initialiser l'état du Scatter-Gather dans la base de données
        await this.gatherStateService.initializeGatherState(
          event.correlationId,
          EventEventMessagingType.EVENT_CREATED,
          {
            emitterId: event.emitterId,
            traceId: event.traceId,
            payload: event.payload.after,
          },
        );
      }),
    );
  }
}
