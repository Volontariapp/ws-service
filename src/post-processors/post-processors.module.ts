import { Module } from '@nestjs/common';
import { RedisProvider } from '@volontariapp/bridge';
import { PostProcessorOptions } from '@volontariapp/post-processors';
import { UserCreatedPostProcessor } from './users/user-created.post-processor.js';
import { UserDeletedPostProcessor } from './users/user-deleted.post-processor.js';
import { UserSocialCreatedPostProcessor } from './users/user-social-created.post-processor.js';
import { UserSocialDeletedPostProcessor } from './users/user-social-deleted.post-processor.js';
import { UserSocialDeletedFailedPostProcessor } from './users/user-social-deleted-failed.post-processor.js';
import { UserPostDeletedPostProcessor } from './users/user-post-deleted.post-processor.js';
import { UserPostDeletedFailedPostProcessor } from './users/user-post-deleted-failed.post-processor.js';
import { UserEventDeletedPostProcessor } from './users/user-event-deleted.post-processor.js';
import { UserEventDeletedFailedPostProcessor } from './users/user-event-deleted-failed.post-processor.js';
import { UserStorageDeletedPostProcessor } from './users/user-storage-deleted.post-processor.js';
import { UserStorageDeletedFailedPostProcessor } from './users/user-storage-deleted-failed.post-processor.js';
import { UserRankingDeletedPostProcessor } from './users/user-ranking-deleted.post-processor.js';
import { UserRankingDeletedFailedPostProcessor } from './users/user-ranking-deleted-failed.post-processor.js';
import { GatherReaperService } from '../core/services/gather-reaper.service.js';
import { UserBadgeAwardedPostProcessor } from './users/user-badge-awarded.post-processor.js';
import { EventAttendanceSetPostProcessor } from './events/event-attendance-set.post-processor.js';
import { UserImpactScoreCreditedPostProcessor } from './users/user-impact-score-credited.post-processor.js';
import { FileScannedPostProcessor } from './storage/file-scanned.post-processor.js';
import { FileRejectedPostProcessor } from './storage/file-rejected.post-processor.js';
import { AttachmentRejectedPostProcessor } from './storage/attachment-rejected.post-processor.js';
import { SocialEventCreatedPostProcessor } from './events/social-event-created.post-processor.js';
import { EventCreatedPostProcessor } from './events/event-created.post-processor.js';
import { GeocodedSuccessPostProcessor } from './events/geocoded-success.post-processor.js';
import { GeocodingFailedPostProcessor } from './events/geocoding-failed.post-processor.js';
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
import { PostSocialCreatedPostProcessor } from './posts/post-social-created.post-processor.js';
import { PostSocialDeletedPostProcessor } from './posts/post-social-deleted.post-processor.js';
import { CommentCreatedPostProcessor } from './posts/comment/comment-created.post-processor.js';
import { CommentDeletedPostProcessor } from './posts/comment/comment-deleted.post-processor.js';
import { PostLikedPostProcessor } from './posts/interactions/post-liked.post-processor.js';
import { PostUnlikedPostProcessor } from './posts/interactions/post-unliked.post-processor.js';
import { JobOutboxSuccessPostProcessor } from './jobs/job-outbox-success.post-processor.js';
import { JobOutboxFailedPostProcessor } from './jobs/job-outbox-failed.post-processor.js';
import {
  WS_USER_CREATED_POST_PROCESSOR_OPTIONS,
  WS_USER_DELETED_POST_PROCESSOR_OPTIONS,
  WS_USER_SOCIAL_CREATED_POST_PROCESSOR_OPTIONS,
  WS_USER_SOCIAL_DELETED_POST_PROCESSOR_OPTIONS,
  WS_USER_SOCIAL_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
  WS_USER_POST_DELETED_POST_PROCESSOR_OPTIONS,
  WS_USER_POST_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
  WS_USER_EVENT_DELETED_POST_PROCESSOR_OPTIONS,
  WS_USER_EVENT_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
  WS_USER_STORAGE_DELETED_POST_PROCESSOR_OPTIONS,
  WS_USER_STORAGE_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
  WS_USER_RANKING_DELETED_POST_PROCESSOR_OPTIONS,
  WS_USER_RANKING_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
  WS_SOCIAL_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_GEOCODED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_GEOCODING_FAILED_POST_PROCESSOR_OPTIONS,
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
  WS_POST_SOCIAL_CREATED_POST_PROCESSOR_OPTIONS,
  WS_POST_SOCIAL_DELETED_POST_PROCESSOR_OPTIONS,
  WS_COMMENT_CREATED_POST_PROCESSOR_OPTIONS,
  WS_COMMENT_DELETED_POST_PROCESSOR_OPTIONS,
  WS_POST_LIKED_POST_PROCESSOR_OPTIONS,
  WS_POST_UNLIKED_POST_PROCESSOR_OPTIONS,
  WS_JOB_OUTBOX_SUCCESS_POST_PROCESSOR_OPTIONS,
  WS_JOB_OUTBOX_FAILED_POST_PROCESSOR_OPTIONS,
  WS_USER_BADGE_AWARDED_POST_PROCESSOR_OPTIONS,
  WS_EVENT_ATTENDANCE_SET_POST_PROCESSOR_OPTIONS,
  WS_USER_IMPACT_SCORE_CREDITED_POST_PROCESSOR_OPTIONS,
  WS_FILE_SCANNED_POST_PROCESSOR_OPTIONS,
  WS_FILE_REJECTED_POST_PROCESSOR_OPTIONS,
  WS_ATTACHMENT_REJECTED_POST_PROCESSOR_OPTIONS,
  wsUserCreatedOptionsProvider,
  wsUserDeletedOptionsProvider,
  wsUserSocialCreatedOptionsProvider,
  wsUserSocialDeletedOptionsProvider,
  wsUserSocialDeletedFailedOptionsProvider,
  wsUserPostDeletedOptionsProvider,
  wsUserPostDeletedFailedOptionsProvider,
  wsUserEventDeletedOptionsProvider,
  wsUserEventDeletedFailedOptionsProvider,
  wsUserStorageDeletedOptionsProvider,
  wsUserStorageDeletedFailedOptionsProvider,
  wsUserRankingDeletedOptionsProvider,
  wsUserRankingDeletedFailedOptionsProvider,
  wsSocialEventCreatedOptionsProvider,
  wsEventCreatedOptionsProvider,
  wsEventGeocodedOptionsProvider,
  wsEventGeocodingFailedOptionsProvider,
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
  wsPostSocialCreatedOptionsProvider,
  wsPostSocialDeletedOptionsProvider,
  wsCommentCreatedOptionsProvider,
  wsCommentDeletedOptionsProvider,
  wsPostLikedOptionsProvider,
  wsPostUnlikedOptionsProvider,
  wsJobOutboxSuccessOptionsProvider,
  wsJobOutboxFailedOptionsProvider,
  wsUserBadgeAwardedOptionsProvider,
  wsEventAttendanceSetOptionsProvider,
  wsUserImpactScoreCreditedOptionsProvider,
  wsFileScannedOptionsProvider,
  wsFileRejectedOptionsProvider,
  wsAttachmentRejectedOptionsProvider,
} from './options/index.js';
import { GatewaysModule } from '../gateways/gateways.module.js';
import { CoreModule } from '../core/core.module.js';
import { NotificationService } from '../gateways/notification.service.js';
import { GatherStateService } from '../core/services/gather-state.service.js';
import { GLOBAL_REDIS_PROVIDER, GlobalRedisModule } from './global-redis.module.js';
import { PostProcessorRegistry } from './post-processor-registry.service.js';

export { GLOBAL_REDIS_PROVIDER } from './global-redis.module.js';

@Module({
  // GlobalRedisModule is imported here only: NestJS destroys this module first, so the
  // registry awaits every post-processor before the global Redis client disconnects.
  imports: [GatewaysModule, CoreModule, GlobalRedisModule],
  providers: [
    GatherReaperService,
    PostProcessorRegistry,
    wsUserCreatedOptionsProvider,
    wsUserDeletedOptionsProvider,
    wsUserSocialCreatedOptionsProvider,
    wsUserSocialDeletedOptionsProvider,
    wsUserSocialDeletedFailedOptionsProvider,
    wsUserPostDeletedOptionsProvider,
    wsUserPostDeletedFailedOptionsProvider,
    wsUserEventDeletedOptionsProvider,
    wsUserEventDeletedFailedOptionsProvider,
    wsUserStorageDeletedOptionsProvider,
    wsUserStorageDeletedFailedOptionsProvider,
    wsUserRankingDeletedOptionsProvider,
    wsUserRankingDeletedFailedOptionsProvider,
    wsSocialEventCreatedOptionsProvider,
    wsEventCreatedOptionsProvider,
    wsEventGeocodedOptionsProvider,
    wsEventGeocodingFailedOptionsProvider,
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
    wsPostSocialCreatedOptionsProvider,
    wsPostSocialDeletedOptionsProvider,
    wsCommentCreatedOptionsProvider,
    wsCommentDeletedOptionsProvider,
    wsPostLikedOptionsProvider,
    wsPostUnlikedOptionsProvider,
    wsJobOutboxSuccessOptionsProvider,
    wsJobOutboxFailedOptionsProvider,
    wsUserBadgeAwardedOptionsProvider,
    wsEventAttendanceSetOptionsProvider,
    wsUserImpactScoreCreditedOptionsProvider,
    wsFileScannedOptionsProvider,
    wsFileRejectedOptionsProvider,
    wsAttachmentRejectedOptionsProvider,
    {
      provide: UserCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserCreatedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_CREATED_POST_PROCESSOR_OPTIONS,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_DELETED_POST_PROCESSOR_OPTIONS,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserSocialCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserSocialCreatedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_SOCIAL_CREATED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserSocialDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserSocialDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_SOCIAL_DELETED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserSocialDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserSocialDeletedFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_SOCIAL_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserPostDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserPostDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_POST_DELETED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserPostDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserPostDeletedFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_POST_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserEventDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserEventDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_EVENT_DELETED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserEventDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserEventDeletedFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_EVENT_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserStorageDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserStorageDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_STORAGE_DELETED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserStorageDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserStorageDeletedFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_STORAGE_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserRankingDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserRankingDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_RANKING_DELETED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserRankingDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserRankingDeletedFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_RANKING_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: SocialEventCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new SocialEventCreatedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_SOCIAL_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: EventCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new EventCreatedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: GeocodedSuccessPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new GeocodedSuccessPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_EVENT_GEOCODED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: GeocodingFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new GeocodingFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_EVENT_GEOCODING_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostCreatedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_CREATED_POST_PROCESSOR_OPTIONS,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostSocialCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostSocialCreatedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_SOCIAL_CREATED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: LogPostCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new LogPostCreatedPostProcessor(redisProvider.getDriver(), launchOptions),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_LOG_POST_CREATED_POST_PROCESSOR_OPTIONS,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostCreationFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostCreationFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_CREATION_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_DELETED_POST_PROCESSOR_OPTIONS,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostSocialDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostSocialDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_SOCIAL_DELETED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostDeletionFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostDeletionFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_DELETION_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: CommentCreatedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new CommentCreatedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_COMMENT_CREATED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: CommentDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new CommentDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_COMMENT_DELETED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostLikedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostLikedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_LIKED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostUnlikedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostUnlikedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_UNLIKED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: JobOutboxSuccessPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new JobOutboxSuccessPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_JOB_OUTBOX_SUCCESS_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: JobOutboxFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new JobOutboxFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_JOB_OUTBOX_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: EventDeletedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new EventDeletedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_EVENT_DELETED_POST_PROCESSOR_OPTIONS,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: SocialEventDeletedSuccessPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new SocialEventDeletedSuccessPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_SOCIAL_EVENT_DELETED_SUCCESS_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: SocialEventDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new SocialEventDeletedFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_SOCIAL_EVENT_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostEventDeletedSuccessPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostEventDeletedSuccessPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_EVENT_DELETED_SUCCESS_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: PostEventDeletedFailedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        gatherStateService: GatherStateService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new PostEventDeletedFailedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
              gatherStateService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_POST_EVENT_DELETED_FAILED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        GatherStateService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: EventAttendanceSetPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new EventAttendanceSetPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_EVENT_ATTENDANCE_SET_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserBadgeAwardedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserBadgeAwardedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_BADGE_AWARDED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: UserImpactScoreCreditedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new UserImpactScoreCreditedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_USER_IMPACT_SCORE_CREDITED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: FileScannedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new FileScannedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_FILE_SCANNED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: FileRejectedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new FileRejectedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_FILE_REJECTED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
    {
      provide: AttachmentRejectedPostProcessor,
      useFactory: async (
        redisProvider: RedisProvider,
        options: PostProcessorOptions,
        notificationService: NotificationService,
        registry: PostProcessorRegistry,
      ) => {
        await redisProvider.connect();
        return registry.launch(
          options,
          (launchOptions) =>
            new AttachmentRejectedPostProcessor(
              redisProvider.getDriver(),
              launchOptions,
              notificationService,
            ),
        );
      },
      inject: [
        GLOBAL_REDIS_PROVIDER,
        WS_ATTACHMENT_REJECTED_POST_PROCESSOR_OPTIONS,
        NotificationService,
        PostProcessorRegistry,
      ],
    },
  ],
})
export class PostProcessorsModule {}
