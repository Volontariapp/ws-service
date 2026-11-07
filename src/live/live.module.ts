import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module.js';
import { GatewaysModule } from '../gateways/gateways.module.js';
import { LiveGrantService } from './live-grant.service.js';
import { LiveInternalController } from './live-internal.controller.js';
import { LiveInternalGuard } from './live-internal.guard.js';
import { LiveGateway } from './live.gateway.js';

@Module({
  imports: [CoreModule, GatewaysModule],
  controllers: [LiveInternalController],
  providers: [LiveGrantService, LiveInternalGuard, LiveGateway],
  exports: [LiveGrantService],
})
export class LiveModule {}
