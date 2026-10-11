import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { GatherStateRepository } from '../repositories/gather-state.repository.js';
import { GatherStateService } from './gather-state.service.js';
import { NotificationService } from '../../gateways/notification.service.js';
import { EventStatus, GatherStateModel, EventQueueModel } from '@volontariapp/database';
import {
  SagaGatherType,
  getGatherCompletionConfig,
  getWsEventForEvent,
  type WebsocketEventRegistry,
} from '@volontariapp/messaging';
import { AppDataSource } from '../../config/data-source.js';
import { EventQueueRepository } from '@volontariapp/outbox';
import type { Streams } from '@volontariapp/shared';

const TRIGGER_TO_SAGA_GATHER: Record<string, SagaGatherType> = {
  'event.created': SagaGatherType.EVENT_CREATION,
  'event.deleted': SagaGatherType.EVENT_DELETION,
  'post.created': SagaGatherType.POST_CREATION,
  'post.deleted': SagaGatherType.POST_DELETION,
  'user.created': SagaGatherType.USER_CREATION,
  'user.deleted': SagaGatherType.USER_DELETION,
};

@Injectable()
export class GatherReaperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GatherReaperService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly gatherStateRepository: GatherStateRepository,
    private readonly gatherStateService: GatherStateService,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV !== 'test') {
      this.timer = setInterval(() => {
        void this.reapExpiredGathers();
      }, 10000);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async reapExpiredGathers(maxAgeMs: number = 60000): Promise<number> {
    const gatherStates = await this.gatherStateRepository.find();
    let reapedCount = 0;
    const now = Date.now();

    for (const gatherState of gatherStates) {
      let hasTimedOutKey = false;
      const correlationId = gatherState.correlationId;

      for (const [expectedKey, eventState] of Object.entries(gatherState.gatherEventsState)) {
        if (eventState.status === EventStatus.PENDING) {
          const updatedAt = new Date(eventState.updatedAt).getTime();
          if (now - updatedAt >= maxAgeMs) {
            this.logger.warn(
              `Reaping expired key ${expectedKey} for correlationId ${correlationId} (age: ${String(now - updatedAt)}ms)`,
            );
            hasTimedOutKey = true;

            const updateResult = await this.gatherStateService.updateEventState(
              correlationId,
              expectedKey,
              EventStatus.FAILED,
              'Gather timeout reached',
            );

            if (updateResult.isComplete && updateResult.metadata) {
              await this.handleCompletion(gatherState.triggerEvent, correlationId, updateResult);
              reapedCount++;
              break;
            }
          }
        }
      }

      if (hasTimedOutKey) {
        this.logger.debug(`Processed expired keys for correlationId ${correlationId}`);
      }
    }

    return reapedCount;
  }

  private async handleCompletion(
    triggerEvent: string,
    correlationId: string,
    result: Awaited<ReturnType<GatherStateService['updateEventState']>>,
  ): Promise<void> {
    const metadata = result.metadata;
    const gatherStateId = result.gatherStateId;
    if (!metadata || !gatherStateId) {
      return;
    }

    const aggregationConfig = this.gatherStateService.getAggregationConfig(triggerEvent);
    const eventType = result.isSuccess
      ? aggregationConfig.successEvent
      : aggregationConfig.failureEvent;
    const wsType = getWsEventForEvent(eventType);

    const triggerPayload = (metadata.payload ?? {}) as Record<string, unknown>;
    const wsPayload = result.isSuccess
      ? metadata.payload
      : { ...triggerPayload, failedEvents: result.failedEvents };

    const sagaGatherType = TRIGGER_TO_SAGA_GATHER[triggerEvent] ?? SagaGatherType.USER_DELETION;
    const isTargetOnlyEmitter = sagaGatherType === SagaGatherType.USER_DELETION;

    try {
      if (metadata.emitterId) {
        if (isTargetOnlyEmitter) {
          const isEmitterPayload = {
            ...(wsPayload as Record<string, unknown>),
            isEmitter: true,
          };
          await this.notificationService.notifyUser(
            metadata.emitterId,
            wsType,
            isEmitterPayload as WebsocketEventRegistry[typeof wsType],
          );
        } else {
          if (result.isSuccess) {
            this.notificationService.broadcastExcept(
              metadata.emitterId,
              wsType,
              wsPayload as WebsocketEventRegistry[typeof wsType],
            );
          }
          await this.notificationService.notifyUser(
            metadata.emitterId,
            wsType,
            wsPayload as WebsocketEventRegistry[typeof wsType],
          );
        }
      } else if (!isTargetOnlyEmitter) {
        this.notificationService.broadcast(
          wsType,
          wsPayload as WebsocketEventRegistry[typeof wsType],
        );
      }
    } catch (err) {
      this.logger.error('Failed to dispatch websocket feedback on reap:', err);
    }

    const config = getGatherCompletionConfig(sagaGatherType);

    await AppDataSource.transaction(async (entityManager) => {
      const transactionalGatherStateRepo = new GatherStateRepository(
        entityManager.getRepository(GatherStateModel),
      );
      const transactionalEventQueueRepo = new EventQueueRepository(
        entityManager.getRepository(EventQueueModel),
      );

      await transactionalGatherStateRepo.delete(gatherStateId);

      await transactionalEventQueueRepo.create({
        type: eventType,
        emitter: 'ws-service',
        emitterId: metadata.emitterId,
        traceId: metadata.traceId,
        correlationId,
        version: 1,
        payload: {
          before: undefined,
          after: {
            ...triggerPayload,
            userId: metadata.emitterId ?? null,
            ...(result.isSuccess ? {} : { failedEvents: result.failedEvents ?? null }),
          } as never,
        },
        targetServices: [config.stream as Streams],
      });
    });
  }
}
