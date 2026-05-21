import { DynamicModule, Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module.js';
import type { CustomConfig } from './config/custom-config.js';
import { AppGateway } from './gateways/app.gateway.js';

@Module({})
export class AppModule {
  static register(config: CustomConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [AppConfigModule.forRoot(config)],
      providers: [AppGateway],
    };
  }
}
