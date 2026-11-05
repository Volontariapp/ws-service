import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventStatus } from '@volontariapp/database';
import { GatherStateService } from '../../../core/services/gather-state.service.js';
import type { GatherStateRepository } from '../../../core/repositories/gather-state.repository.js';
import { createGatherStateRepositoryMock } from '../../helpers/mocks/gather-state.repository.mock.js';
import { createScatterGatherConfigMock } from '../../helpers/mocks/app-config.service.mock.js';
import {
  createGatherEventStates,
  createUserDeletionGatherState,
  USER_DELETION_EXPECTS,
} from '../../helpers/factories/gather-state.factory.js';

describe('GatherStateService.updateEventState (Unit)', () => {
  let service: GatherStateService;
  let repositoryMock: jest.Mocked<GatherStateRepository>;

  beforeEach(() => {
    repositoryMock = createGatherStateRepositoryMock();
    service = new GatherStateService(repositoryMock, createScatterGatherConfigMock());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates the write to the atomic repository method and never does a read-modify-write', async () => {
    const setEventStateSpy = jest.spyOn(repositoryMock, 'setEventState');
    const updateSpy = jest.spyOn(repositoryMock, 'update');
    const findOneSpy = jest.spyOn(repositoryMock, 'findOne');
    const gather = createUserDeletionGatherState();
    setEventStateSpy.mockResolvedValue(gather);

    await service.updateEventState(gather.correlationId, 'USER_POST_DELETED', EventStatus.SUCCESS);

    expect(setEventStateSpy).toHaveBeenCalledWith(
      gather.correlationId,
      'USER_POST_DELETED',
      expect.objectContaining({ status: EventStatus.SUCCESS }),
    );
    expect(updateSpy).not.toHaveBeenCalled();
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it('passes the error reason through to the repository', async () => {
    const setEventStateSpy = jest.spyOn(repositoryMock, 'setEventState');
    setEventStateSpy.mockResolvedValue(createUserDeletionGatherState());

    await service.updateEventState('corr', 'USER_POST_DELETED', EventStatus.FAILED, 'boom');

    expect(setEventStateSpy).toHaveBeenCalledWith(
      'corr',
      'USER_POST_DELETED',
      expect.objectContaining({ status: EventStatus.FAILED, errorReason: 'boom' }),
    );
  });

  it('returns incomplete when the gather is unknown or the event is not expected', async () => {
    repositoryMock.setEventState.mockResolvedValue(null);

    const result = await service.updateEventState('missing', 'UNKNOWN', EventStatus.SUCCESS);

    expect(result).toEqual({ isComplete: false });
  });

  it('returns incomplete while at least one expected event is still PENDING', async () => {
    const gatherEventsState = createGatherEventStates(USER_DELETION_EXPECTS);
    gatherEventsState['USER_POST_DELETED'].status = EventStatus.SUCCESS;
    repositoryMock.setEventState.mockResolvedValue(
      createUserDeletionGatherState({ gatherEventsState }),
    );

    const result = await service.updateEventState('corr', 'USER_POST_DELETED', EventStatus.SUCCESS);

    expect(result).toEqual({ isComplete: false });
  });

  it('returns a successful completion with the metadata once every event is resolved', async () => {
    const gather = createUserDeletionGatherState({
      gatherEventsState: createGatherEventStates(USER_DELETION_EXPECTS, EventStatus.SUCCESS),
    });
    repositoryMock.setEventState.mockResolvedValue(gather);

    const result = await service.updateEventState(
      gather.correlationId,
      'USER_RANKING_DELETED',
      EventStatus.SUCCESS,
    );

    expect(result).toEqual({
      isComplete: true,
      isSuccess: true,
      failedEvents: [],
      metadata: gather.metadata,
      gatherStateId: gather.id,
    });
  });

  it('reports the failed events when the gather completes with a FAILED one', async () => {
    const gatherEventsState = createGatherEventStates(USER_DELETION_EXPECTS, EventStatus.SUCCESS);
    gatherEventsState['USER_STORAGE_DELETED'].status = EventStatus.FAILED;
    repositoryMock.setEventState.mockResolvedValue(
      createUserDeletionGatherState({ gatherEventsState }),
    );

    const result = await service.updateEventState(
      'corr',
      'USER_STORAGE_DELETED',
      EventStatus.FAILED,
    );

    expect(result.isComplete).toBe(true);
    expect(result.isSuccess).toBe(false);
    expect(result.failedEvents).toEqual(['USER_STORAGE_DELETED']);
  });
});
