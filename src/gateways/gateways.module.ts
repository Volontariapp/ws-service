import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway.js';
import { NotificationService } from './notification.service.js';
import { CoreModule } from '../core/core.module.js';

@Module({
  imports: [CoreModule],
  providers: [AppGateway, NotificationService],
  exports: [AppGateway, NotificationService],
})
export class GatewaysModule {}
