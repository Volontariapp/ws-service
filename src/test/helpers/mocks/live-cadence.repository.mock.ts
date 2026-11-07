import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { ILiveCadenceRepository } from '../../../modules/live/repositories/interfaces/live-cadence.repository.js';

export const createLiveCadenceRepositoryMock = (): jest.Mocked<ILiveCadenceRepository> => {
  const mock = createMock<ILiveCadenceRepository>();
  mock.tryAcquire.mockResolvedValue(true);
  return mock;
};
