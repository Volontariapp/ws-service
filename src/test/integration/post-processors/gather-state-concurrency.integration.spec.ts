import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { EventStatus, GatherStateModel } from '@volontariapp/database';
import { UserEventMessagingType } from '@volontariapp/messaging';
import { AppDataSource } from '../../../config/data-source.js';
import { GatherStateRepository } from '../../../core/repositories/gather-state.repository.js';
import { GatherStateService } from '../../../core/services/gather-state.service.js';
import { createScatterGatherConfigMock } from '../../helpers/mocks/app-config.service.mock.js';
import { USER_DELETION_EXPECTS } from '../../helpers/factories/gather-state.factory.js';
import { SOURCE_TRACEPARENT } from '../../helpers/factories/trace.factory.js';

describe('GatherStateService concurrent acknowledgements (Integration)', () => {
  let service: GatherStateService;
  let repository: GatherStateRepository;
  const correlationId = '22222222-3333-4444-8555-666666666666';

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      const opts = AppDataSource.options as {
        type?: string;
        host?: string;
        migrations?: unknown[];
      };
      opts.migrations = [];
      if (opts.type === 'postgres' && opts.host === 'localhost') {
        opts.host = '127.0.0.1';
      }
      await AppDataSource.initialize();
    }
    repository = new GatherStateRepository(AppDataSource.getRepository(GatherStateModel));
    service = new GatherStateService(repository, createScatterGatherConfigMock());
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await AppDataSource.getRepository(GatherStateModel).clear();
    await service.initializeGatherState(correlationId, UserEventMessagingType.USER_DELETED, {
      traceparent: SOURCE_TRACEPARENT,
    });
  });

  const acknowledgeAll = async (failingKey?: string) =>
    Promise.all(
      USER_DELETION_EXPECTS.map((key) =>
        service.updateEventState(
          correlationId,
          key,
          key === failingKey ? EventStatus.FAILED : EventStatus.SUCCESS,
          key === failingKey ? 'boom' : undefined,
        ),
      ),
    );

  it('keeps every concurrent SUCCESS and reports exactly one completion', async () => {
    const results = await acknowledgeAll();

    const stored = await repository.findOne({ correlationId });
    for (const key of USER_DELETION_EXPECTS) {
      expect(stored?.gatherEventsState[key].status).toBe(EventStatus.SUCCESS);
      expect(stored?.gatherEventsState[key].eventType).toBe(key);
    }

    const completions = results.filter((result) => result.isComplete);
    expect(completions).toHaveLength(1);
    expect(completions[0].isSuccess).toBe(true);
    expect(completions[0].failedEvents).toEqual([]);
  });

  it('reports exactly one failed completion when one acknowledgement is FAILED', async () => {
    const results = await acknowledgeAll('USER_RANKING_DELETED');

    const stored = await repository.findOne({ correlationId });
    expect(stored?.gatherEventsState['USER_RANKING_DELETED'].status).toBe(EventStatus.FAILED);
    expect(stored?.gatherEventsState['USER_RANKING_DELETED'].errorReason).toBe('boom');

    const completions = results.filter((result) => result.isComplete);
    expect(completions).toHaveLength(1);
    expect(completions[0].isSuccess).toBe(false);
    expect(completions[0].failedEvents).toEqual(['USER_RANKING_DELETED']);
  });

  it('returns incomplete for an unknown gather or an unexpected event without writing', async () => {
    const unknown = await service.updateEventState(
      '99999999-9999-4999-8999-999999999999',
      'USER_POST_DELETED',
      EventStatus.SUCCESS,
    );
    const unexpected = await service.updateEventState(
      correlationId,
      'NOT_EXPECTED',
      EventStatus.SUCCESS,
    );

    expect(unknown).toEqual({ isComplete: false });
    expect(unexpected).toEqual({ isComplete: false });
    const stored = await repository.findOne({ correlationId });
    expect(Object.keys(stored?.gatherEventsState ?? {}).sort()).toEqual(
      [...USER_DELETION_EXPECTS].sort(),
    );
  });
});
