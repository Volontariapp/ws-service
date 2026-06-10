import { BatchPostProcessor, type BatchEventItem } from '@volontariapp/post-processors';
import { Injectable } from '@nestjs/common';
import { PostEventMessagingType } from '@volontariapp/messaging';

@Injectable()
export class LogPostCreatedPostProcessor extends BatchPostProcessor<PostEventMessagingType.POST_CREATED> {
  // TODO: CLEMENT -> METTRE DANS LE REDIS ou POSTGRES LE BAIL + RENAME
  protected override shouldProcess(eventType: PostEventMessagingType | string): boolean {
    return eventType === PostEventMessagingType.POST_CREATED.toString();
  }

  protected async processEvents(
    events: BatchEventItem<PostEventMessagingType.POST_CREATED>[],
  ): Promise<void> {
    await Promise.all(
      events.map(async ({ event, messageId }) => {
        this.logger.info('Logged POST_CREATED event', {
          messageId,
          eventId: event.id,
          correlationId: event.correlationId,
        });
        await Promise.resolve(); // just to avoid ts complaining about async without await
      }),
    );
  }
}
