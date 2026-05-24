import type { jest } from '@jest/globals';
import type { JwtService } from '@volontariapp/auth';
import { createMock } from '@volontariapp/testing';
import { createJwtPayloadMock } from '../factories/jwt-payload.factory.js';

export const createJwtServiceMock = (): jest.Mocked<JwtService> => {
  const mock = createMock<JwtService>();
  mock.verifyInternal.mockResolvedValue(createJwtPayloadMock());
  return mock;
};
