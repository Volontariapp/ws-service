import { Injectable, Logger } from '@nestjs/common';
import { AppGateway } from './app.gateway.js';
import { SocketManagerService } from '../core/services/socket-manager.service.js';
import type { WebsocketMessagingType, WebsocketEventRegistry } from '@volontariapp/messaging';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly appGateway: AppGateway,
    private readonly socketManager: SocketManagerService,
  ) {}

  async notifyUser<K extends WebsocketMessagingType>(
    userId: string,
    event: K,
    payload: WebsocketEventRegistry[K],
  ): Promise<void> {
    const isConnected = await this.socketManager.isUserTracked(userId);
    if (!isConnected) {
      this.logger.warn(
        `Skipping notification for user ${userId} (not tracked in Redis) — event: ${event}`,
      );
      return;
    }

    this.appGateway.server.to(userId).emit(event, payload);
    this.logger.log(`Notified user ${userId} with event ${event}`);
  }

  broadcast<K extends WebsocketMessagingType>(event: K, payload: WebsocketEventRegistry[K]): void {
    this.appGateway.server.emit(event, payload);
    this.logger.log(`Broadcasted event ${event} to all connected users`);
  }

  broadcastExcept<K extends WebsocketMessagingType>(
    excludeUserId: string,
    event: K,
    payload: WebsocketEventRegistry[K],
  ): void {
    this.appGateway.server.except(excludeUserId).emit(event, payload);
    this.logger.log(`Broadcasted event ${event} to all users except ${excludeUserId}`);
  }
}
