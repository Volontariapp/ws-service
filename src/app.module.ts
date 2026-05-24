import { DynamicModule, Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module.js';
import type { CustomConfig } from './config/custom-config.js';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from '@volontariapp/health-check-nest';
import { RedisBridgeModule } from '@volontariapp/bridge-nest';
import { PostProcessorsModule } from './post-processors/post-processors.module.js';
import { AuthModule } from '@volontariapp/auth';

import { GatewaysModule } from './gateways/gateways.module.js';

@Module({})
export class AppModule {
  static register(config: CustomConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        GatewaysModule,
        PostProcessorsModule,
        AppConfigModule.forRoot(config),
        RedisBridgeModule.register(config.redis),
        TerminusModule.forRoot({}),
        HealthModule.register({
          databases: ['redis'],
          failOnMissingProvider: true,
        }),
        AuthModule.registerMicroservice(config.auth),
      ],
    };
  }
}
