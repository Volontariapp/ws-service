import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { NotificationService } from '../../gateways/notification.service.js';
import { EventEventMessagingType, getWsEventForEvent } from '@volontariapp/messaging';

@Injectable()
export class JobOutboxSuccessPostProcessor extends BatchPostProcessor<EventEventMessagingType> {
  constructor(
    redisClient: Redis,
    options: PostProcessorOptions,
    private readonly notificationService: NotificationService,
  ) {
    super(redisClient, options);
  }

  protected override shouldProcess(eventType: EventEventMessagingType | string): boolean {
    try {
      getWsEventForEvent(eventType);
      return true;
    } catch {
      return false;
    }
  }

  protected async processEvents(events: BatchEventItem<EventEventMessagingType>[]): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        await Promise.resolve();
        this.logger.info('Processing WS_JOBS_OUTBOX_SUCCESS', {
          messageId,
          eventId: event.id,
          type: event.type,
        });

        let wsEventType;
        try {
          wsEventType = getWsEventForEvent(event.type);
        } catch {
          this.logger.debug(`Skipping event ${event.type}: No WS mapping found`, { messageId });
          return;
        }

        const payload = event.payload.after as {
          originalPayload?: { userId?: string; [key: string]: unknown };
        };
        const originalPayload = payload.originalPayload;

        if (originalPayload?.userId) {
          const wsPayload = { isEmitter: true, ...originalPayload };
          await this.notificationService.notifyUser(
            originalPayload.userId,
            wsEventType,
            wsPayload as never,
          );
        } else {
          this.logger.debug('No userId found in originalPayload for WS_JOBS_OUTBOX_SUCCESS', {
            messageId,
            eventId: event.id,
          });
        }
      }),
    );
  }
}
