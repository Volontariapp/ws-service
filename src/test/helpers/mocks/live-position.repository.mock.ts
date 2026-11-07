import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { ILivePositionRepository } from '../../../modules/live/repositories/interfaces/live-position.repository.js';

export const createLivePositionRepositoryMock = (): jest.Mocked<ILivePositionRepository> => {
  const mock = createMock<ILivePositionRepository>();
  mock.save.mockResolvedValue(undefined);
  return mock;
};
