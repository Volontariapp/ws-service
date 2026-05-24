import { Injectable, Logger } from '@nestjs/common';
import { AppGateway } from './app.gateway.js';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly appGateway: AppGateway) {}

  notifyUser<T>(userId: string, event: string, payload: T): void {
    this.appGateway.server.to(userId).emit(event, payload);
    this.logger.log(`Notified user ${userId} with event ${event}`);
  }

  broadcast<T>(event: string, payload: T): void {
    this.appGateway.server.emit(event, payload);
    this.logger.log(`Broadcasted event ${event} to all connected users`);
  }
}
