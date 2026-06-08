import { Module } from '@nestjs/common';
import { RedisProvider } from '@volontariapp/bridge';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import { PostProcessorOptions } from '@volontariapp/post-processors';
import { UserCreatedPostProcessor } from './user-created.post-processor.js';
import { EventCreatedPostProcessor } from './event-created.post-processor.js';
import { LogPostCreatedPostProcessor } from './log-post-created.post-processor.js';
import { PostCreatedPostProcessor } from './post-created.post-processor.js';
import { PostCreationFailedPostProcessor } from './post-creation-failed.post-processor.js';
import { PostDeletedPostProcessor } from './post-deleted.post-processor.js';
import { PostDeletionFailedPostProcessor } from './post-deletion-failed.post-processor.js';
import {
  WS_USER_CREATED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
  WS_LOG_POST_CREATED_POST_PROCESSOR_OPTIONS,
  WS_POST_CREATED_POST_PROCESSOR_OPTIONS,
  WS_POST_CREATION_FAILED_POST_PROCESSOR_OPTIONS,
  WS_POST_DELETED_POST_PROCESSOR_OPTIONS,
  WS_POST_DELETION_FAILED_POST_PROCESSOR_OPTIONS,
  wsUserCreatedOptionsProvider,
  wsEventCreatedOptionsProvider,
  wsLogPostCreatedOptionsProvider,
  wsPostCreatedOptionsProvider,
  wsPostCreationFailedOptionsProvider,
  wsPostDeletedOptionsProvider,
  wsPostDeletionFailedOptionsProvider,
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
    wsLogPostCreatedOptionsProvider,
    wsPostCreatedOptionsProvider,
    wsPostCreationFailedOptionsProvider,
    wsPostDeletedOptionsProvider,
    wsPostDeletionFailedOptionsProvider,
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
    {
      provide: PostCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new PostCreatedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [GLOBAL_REDIS_PROVIDER, WS_POST_CREATED_POST_PROCESSOR_OPTIONS, NotificationService],
    },
    {
      provide: LogPostCreatedPostProcessor,
      useFactory: async (redisProvider: RedisProvider, options: PostProcessorOptions) => {
        await redisProvider.connect();
        const postProcessor = new LogPostCreatedPostProcessor(redisProvider.getDriver(), options);
        void postProcessor.start();
        return postProcessor;
      },
      inject: [GLOBAL_REDIS_PROVIDER, WS_LOG_POST_CREATED_POST_PROCESSOR_OPTIONS],
    },
    {
      provide: PostCreationFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new PostCreationFailedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_CREATION_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
      ],
    },
    {
      provide: PostDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new PostDeletedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [GLOBAL_REDIS_PROVIDER, WS_POST_DELETED_POST_PROCESSOR_OPTIONS, NotificationService],
    },
    {
      provide: PostDeletionFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new PostDeletionFailedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_DELETION_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
      ],
    },
  ],
})
export class PostProcessorsModule {}
