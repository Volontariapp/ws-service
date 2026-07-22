import { Module } from '@nestjs/common';
import { RedisProvider } from '@volontariapp/bridge';
import { NestRedisProvider } from '@volontariapp/bridge-nest';
import { PostProcessorOptions } from '@volontariapp/post-processors';
import { UserCreatedPostProcessor } from './users/user-created.post-processor.js';
import { SocialEventCreatedPostProcessor } from './events/social-event-created.post-processor.js';
import { EventCreatedPostProcessor } from './events/event-created.post-processor.js';
import { GeocodedSuccessPostProcessor } from './events/geocoded-success.post-processor.js';
import { EventDeletedPostProcessor } from './events/event-deleted.post-processor.js';
import { SocialEventDeletedSuccessPostProcessor } from './events/social-event-deleted-success.post-processor.js';
import { SocialEventDeletedFailedPostProcessor } from './events/social-event-deleted-failed.post-processor.js';
import { PostEventDeletedSuccessPostProcessor } from './events/post-event-deleted-success.post-processor.js';
import { PostEventDeletedFailedPostProcessor } from './events/post-event-deleted-failed.post-processor.js';
import { LogPostCreatedPostProcessor } from './posts/log-post-created.post-processor.js';
import { PostCreatedPostProcessor } from './posts/post-created.post-processor.js';
import { PostCreationFailedPostProcessor } from './posts/post-creation-failed.post-processor.js';
import { PostDeletedPostProcessor } from './posts/post-deleted.post-processor.js';
import { PostDeletionFailedPostProcessor } from './posts/post-deletion-failed.post-processor.js';
import { JobOutboxSuccessPostProcessor } from './jobs/job-outbox-success.post-processor.js';
import { JobOutboxFailedPostProcessor } from './jobs/job-outbox-failed.post-processor.js';
import {
  WS_USER_CREATED_POST_PROCESSOR_OPTIONS,
  WS_SOCIAL_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_GEOCODED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_DELETED_POST_PROCESSOR_OPTIONS,
  WS_SOCIAL_EVENT_DELETED_SUCCESS_POST_PROCESSOR_OPTIONS,
  WS_SOCIAL_EVENT_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
  WS_POST_EVENT_DELETED_SUCCESS_POST_PROCESSOR_OPTIONS,
  WS_POST_EVENT_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
  WS_LOG_POST_CREATED_POST_PROCESSOR_OPTIONS,
  WS_POST_CREATED_POST_PROCESSOR_OPTIONS,
  WS_POST_CREATION_FAILED_POST_PROCESSOR_OPTIONS,
  WS_POST_DELETED_POST_PROCESSOR_OPTIONS,
  WS_POST_DELETION_FAILED_POST_PROCESSOR_OPTIONS,
  WS_JOB_OUTBOX_SUCCESS_POST_PROCESSOR_OPTIONS,
  WS_JOB_OUTBOX_FAILED_POST_PROCESSOR_OPTIONS,
  wsUserCreatedOptionsProvider,
  wsSocialEventCreatedOptionsProvider,
  wsEventCreatedOptionsProvider,
  wsEventGeocodedOptionsProvider,
  wsEventDeletedOptionsProvider,
  wsSocialEventDeletedSuccessOptionsProvider,
  wsSocialEventDeletedFailedOptionsProvider,
  wsPostEventDeletedSuccessOptionsProvider,
  wsPostEventDeletedFailedOptionsProvider,
  wsLogPostCreatedOptionsProvider,
  wsPostCreatedOptionsProvider,
  wsPostCreationFailedOptionsProvider,
  wsPostDeletedOptionsProvider,
  wsPostDeletionFailedOptionsProvider,
  wsJobOutboxSuccessOptionsProvider,
  wsJobOutboxFailedOptionsProvider,
} from './options/index.js';
import { GatewaysModule } from '../gateways/gateways.module.js';
import { CoreModule } from '../core/core.module.js';
import { SocketManagerService } from '../core/services/socket-manager.service.js';
import { NotificationService } from '../gateways/notification.service.js';
import { AppConfigService } from '../config/app-config.service.js';
import { GatherStateService } from '../core/services/gather-state.service.js';

export const GLOBAL_REDIS_PROVIDER = 'GLOBAL_REDIS_PROVIDER';

@Module({
  imports: [GatewaysModule, CoreModule],
  providers: [
    wsUserCreatedOptionsProvider,
    wsSocialEventCreatedOptionsProvider,
    wsEventCreatedOptionsProvider,
    wsEventGeocodedOptionsProvider,
    wsEventDeletedOptionsProvider,
    wsSocialEventDeletedSuccessOptionsProvider,
    wsSocialEventDeletedFailedOptionsProvider,
    wsPostEventDeletedSuccessOptionsProvider,
    wsPostEventDeletedFailedOptionsProvider,
    wsLogPostCreatedOptionsProvider,
    wsPostCreatedOptionsProvider,
    wsPostCreationFailedOptionsProvider,
    wsPostDeletedOptionsProvider,
    wsPostDeletionFailedOptionsProvider,
    wsJobOutboxSuccessOptionsProvider,
    wsJobOutboxFailedOptionsProvider,
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
      provide: SocialEventCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new SocialEventCreatedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
          gatherStateService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_SOCIAL_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
      ],
    },
    {
      provide: EventCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        gatherStateService: GatherStateService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new EventCreatedPostProcessor(
          redisProvider.getDriver(),
          options,
          gatherStateService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
        GatherStateService,
      ],
    },
    {
      provide: GeocodedSuccessPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new GeocodedSuccessPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
          gatherStateService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_EVENT_GEOCODED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
      ],
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
    {
      provide: JobOutboxSuccessPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new JobOutboxSuccessPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_JOB_OUTBOX_SUCCESS_POST_PROCESSOR_OPTIONS,
        NotificationService,
      ],
    },
    {
      provide: JobOutboxFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new JobOutboxFailedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_JOB_OUTBOX_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
      ],
    },
    {
      provide: EventDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        gatherStateService: GatherStateService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new EventDeletedPostProcessor(
          redisProvider.getDriver(),
          options,
          gatherStateService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_EVENT_DELETED_POST_PROCESSOR_OPTIONS,
        GatherStateService,
      ],
    },
    {
      provide: SocialEventDeletedSuccessPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new SocialEventDeletedSuccessPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
          gatherStateService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_SOCIAL_EVENT_DELETED_SUCCESS_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
      ],
    },
    {
      provide: SocialEventDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new SocialEventDeletedFailedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
          gatherStateService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_SOCIAL_EVENT_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
      ],
    },
    {
      provide: PostEventDeletedSuccessPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new PostEventDeletedSuccessPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
          gatherStateService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_EVENT_DELETED_SUCCESS_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
      ],
    },
    {
      provide: PostEventDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
      ) => {
        await redisProvider.connect();
        const postProcessor = new PostEventDeletedFailedPostProcessor(
          redisProvider.getDriver(),
          options,
          notificationService,
          gatherStateService,
        );
        void postProcessor.start();
        return postProcessor;
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_EVENT_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
      ],
    },
  ],
})
export class PostProcessorsModule {}
