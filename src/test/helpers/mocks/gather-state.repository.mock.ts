import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { GatherStateRepository } from '../../../core/repositories/gather-state.repository.js';

export const createGatherStateRepositoryMock = (): jest.Mocked<GatherStateRepository> =>
  createMock<GatherStateRepository>();
