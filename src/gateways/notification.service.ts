import { Injectable, Logger } from '@nestjs/common';
import { AppGateway } from './app.gateway.js';
import { SocketManagerService } from '../core/services/socket-manager.service.js';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly appGateway: AppGateway,
    private readonly socketManager: SocketManagerService,
  ) {}

  async notifyUser<T>(userId: string, event: string, payload: T): Promise<void> {
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

  broadcast<T>(event: string, payload: T): void {
    this.appGateway.server.emit(event, payload);
    this.logger.log(`Broadcasted event ${event} to all connected users`);
  }

  broadcastExcept<T>(excludeUserId: string, event: string, payload: T): void {
    this.appGateway.server.except(excludeUserId).emit(event, payload);
    this.logger.log(`Broadcasted event ${event} to all users except ${excludeUserId}`);
  }
}
