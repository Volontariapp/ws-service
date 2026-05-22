import { DynamicModule, Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module.js';
import type { CustomConfig } from './config/custom-config.js';
import { AppGateway } from './gateways/app.gateway.js';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from '@volontariapp/health-check-nest';
import { RedisBridgeModule } from '@volontariapp/bridge-nest';

@Module({})
export class AppModule {
  static register(config: CustomConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.forRoot(config),
        RedisBridgeModule.register(config.redis),
        TerminusModule.forRoot({}),
        HealthModule.register({
          databases: ['redis'],
          failOnMissingProvider: true,
        }),
      ],
      providers: [AppGateway],
    };
  }
}
