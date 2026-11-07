import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module.js';
import { GatewaysModule } from '../../gateways/gateways.module.js';
import { LiveGrantInternalController } from './controllers/live-grant.internal.controller.js';
import { LivePositionGateway } from './gateways/live-position.gateway.js';
import { InternalUserBindingGuard } from './guards/internal-user-binding.guard.js';
import {
  LIVE_CADENCE_REPOSITORY,
  LIVE_GRANT_REPOSITORY,
  LIVE_POSITION_REPOSITORY,
} from './live.constants.js';
import { RedisLiveCadenceRepository } from './repositories/redis/redis-live-cadence.repository.js';
import { RedisLiveGrantRepository } from './repositories/redis/redis-live-grant.repository.js';
import { RedisLivePositionRepository } from './repositories/redis/redis-live-position.repository.js';
import { LiveGrantService } from './services/live-grant.service.js';
import { LiveNotifierService } from './services/live-notifier.service.js';
import { LivePositionService } from './services/live-position.service.js';

@Module({
  imports: [CoreModule, GatewaysModule],
  controllers: [LiveGrantInternalController],
  providers: [
    LiveGrantService,
    LivePositionService,
    LiveNotifierService,
    InternalUserBindingGuard,
    LivePositionGateway,
    { provide: LIVE_GRANT_REPOSITORY, useClass: RedisLiveGrantRepository },
    { provide: LIVE_POSITION_REPOSITORY, useClass: RedisLivePositionRepository },
    { provide: LIVE_CADENCE_REPOSITORY, useClass: RedisLiveCadenceRepository },
  ],
  exports: [LiveGrantService],
})
export class LiveModule {}
