import { Module } from '@nestjs/common';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import { AppConfigService } from '../config/app-config.service.js';

export const GLOBAL_REDIS_PROVIDER = 'GLOBAL_REDIS_PROVIDER';

/**
 * Global Redis client read by the post-processors. Kept in its own module, imported only by
 * PostProcessorsModule: NestJS destroys a module before the modules it imports, so the
 * post-processors are stopped (in-flight batches acknowledged) before this client disconnects.
 */
@Module({
  providers: [
    {
      provide: GLOBAL_REDIS_PROVIDER,
      useFactory: (configService: AppConfigService) => {
        return new NestRedisProvider(configService.globalRedis);
      },
      inject: [AppConfigService],
    },
  ],
  exports: [GLOBAL_REDIS_PROVIDER],
})
export class GlobalRedisModule {}
