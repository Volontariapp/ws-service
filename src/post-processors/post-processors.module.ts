import { Module } from '@nestjs/common';
import { RedisProvider } from '@volontariapp/bridge';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import { PostProcessorOptions } from '@volontariapp/post-processors';
import { UserCreatedPostProcessor } from './user-created.post-processor.js';
import { EventCreatedPostProcessor } from './event-created.post-processor.js';
import {
  WS_USER_CREATED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
  wsUserCreatedOptionsProvider,
  wsEventCreatedOptionsProvider,
} from './options/index.js';
import { GatewaysModule } from '../gateways/gateways.module.js';
import { CoreModule } from '../core/core.module.js';
import { SocketManagerService } from '../core/services/socket-manager.service.js';
import { NotificationService } from '../gateways/notification.service.js';
import { AppConfigService } from '../config/app-config.service.js';

export const GLOBAL_REDIS_PROVIDER = 'GLOBAL_REDIS_PROVIDER';

@Module({
  imports: [GatewaysModule, CoreModule],
  providers: [
    wsUserCreatedOptionsProvider,
    wsEventCreatedOptionsProvider,
    {
      provide: GLOBAL_REDIS_PROVIDER,
      useFactory: (configService: AppConfigService) => {
        return new NestRedisProvider(configService.globalRedis);
      },
      inject: [AppConfigService],
    },
    {
      provide: UserCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        socketManager: SocketManagerService,
        notificationService: NotificationService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new UserCreatedPostProcessor(
          redisProvider.getDriver(),
          options,
          socketManager,
          notificationService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_CREATED_POST_PROCESSOR_OPTIONS,
        SocketManagerService,
        NotificationService,
      ],
    },
    {
      provide: EventCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new EventCreatedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [GLOBAL_REDIS_PROVIDER, WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS, NotificationService],
    },
  ],
})
export class PostProcessorsModule {}
