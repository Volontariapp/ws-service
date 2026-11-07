import { Injectable } from '@nestjs/common';
import { LiveWebsocketMessagingType, type LiveSharingStopReason } from '@volontariapp/messaging';
import { NotificationService } from '../../../gateways/notification.service.js';
import type { LiveStoredPosition } from '../domain/live-stored-position.js';

@Injectable()
export class LiveNotifierService {
  constructor(private readonly notificationService: NotificationService) {}

  async notifySharingStopped(
    recipientId: string,
    eventId: string,
    userId: string,
    reason: LiveSharingStopReason,
  ): Promise<void> {
    await this.notificationService.notifyUser(
      recipientId,
      LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
      { eventId, userId, reason },
    );
  }

  async notifyPositionUpdated(
    organizerId: string,
    eventId: string,
    userId: string,
    position: LiveStoredPosition,
  ): Promise<void> {
    await this.notificationService.notifyUser(
      organizerId,
      LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED,
      {
        eventId,
        positions: [
          {
            userId,
            latitude: position.latitude,
            longitude: position.longitude,
            updatedAt: position.updatedAt,
          },
        ],
      },
    );
  }
}
