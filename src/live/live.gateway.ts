import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { LiveClientMessageType, LiveWebsocketMessagingType } from '@volontariapp/messaging';
import type { Socket } from 'socket.io';
import { NotificationService } from '../gateways/notification.service.js';
import { haversineDistanceM, roundCoordinate } from './live-geo.js';
import { LiveGrantService } from './live-grant.service.js';
import { parseLivePositionPayload } from './live-position.payload.js';
import { LIVE_ARRIVAL_FALLBACK_RADIUS_M } from './live.constants.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class LiveGateway {
  private readonly logger = new Logger(LiveGateway.name);

  constructor(
    private readonly grantService: LiveGrantService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Journaux : identifiants et raisons seulement. Jamais une latitude ou une longitude, ni brute,
   * ni arrondie, ni dans un objet, ni dans une chaine (le masquage ne couvre que les cles).
   */
  @SubscribeMessage(LiveClientMessageType.LIVE_POSITION)
  async handlePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    // 0. identite (posee par AppGateway.handleConnection) et payload
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) {
      this.logger.debug(`Ignored live.position from socket ${client.id}: not authenticated yet`);
      return;
    }
    const payload = parseLivePositionPayload(body);
    if (!payload) {
      this.logger.warn(`Ignored live.position from user ${userId}: invalid payload`);
      return;
    }
    const { eventId } = payload;

    try {
      // 1. autorisation
      const grant = await this.grantService.getGrant(eventId, userId);
      if (!grant) {
        this.logger.log(`Live position refused for user ${userId} on event ${eventId}: no grant`);
        await this.notificationService.notifyUser(
          userId,
          LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
          { eventId, userId, reason: 'REVOKED' },
        );
        return;
      }

      // 2. cadence
      if (!(await this.grantService.acquireCadenceSlot(eventId, userId))) {
        this.logger.debug(
          `Ignored live.position from user ${userId} on event ${eventId}: too soon`,
        );
        return;
      }

      // 3. arrondi
      const latitude = roundCoordinate(payload.latitude);
      const longitude = roundCoordinate(payload.longitude);
      const updatedAt = new Date(Date.now()).toISOString();

      // 4. derniere position
      await this.grantService.storePosition(eventId, userId, { latitude, longitude, updatedAt });

      // 5. repli d'arrivee (D17) ou envoi a l'organisateur
      const distanceM = haversineDistanceM(
        { latitude, longitude },
        { latitude: grant.eventLatitude, longitude: grant.eventLongitude },
      );
      if (distanceM <= LIVE_ARRIVAL_FALLBACK_RADIUS_M) {
        const removed = await this.grantService.revoke(eventId, userId);
        if (!removed) {
          // Une revocation concurrente a deja retire l'autorisation et notifie.
          return;
        }
        this.logger.log(`Live sharing stopped for user ${userId} on event ${eventId}: ARRIVED`);
        await this.notificationService.notifyUser(
          userId,
          LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
          { eventId, userId, reason: 'ARRIVED' },
        );
        await this.notificationService.notifyUser(
          grant.organizerId,
          LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
          { eventId, userId, reason: 'ARRIVED' },
        );
        return;
      }
      await this.notificationService.notifyUser(
        grant.organizerId,
        LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED,
        { eventId, positions: [{ userId, latitude, longitude, updatedAt }] },
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.name : 'unknown error';
      this.logger.error(`live.position failed for user ${userId} on event ${eventId}: ${reason}`);
    }
  }
}
