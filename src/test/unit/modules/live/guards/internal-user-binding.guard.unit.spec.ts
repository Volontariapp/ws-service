import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@volontariapp/auth';
import { InternalUserBindingGuard } from '../../../../../modules/live/guards/internal-user-binding.guard.js';
import { createLiveHttpContext } from '../../../../helpers/factories/live-http-context.factory.js';
import { createJwtPayloadMock } from '../../../../helpers/factories/jwt-payload.factory.js';
import { createJwtServiceMock } from '../../../../helpers/mocks/jwt.service.mock.js';

describe('InternalUserBindingGuard (Unit)', () => {
  let jwtServiceMock: jest.Mocked<JwtService>;
  let guard: InternalUserBindingGuard;

  beforeEach(() => {
    jwtServiceMock = createJwtServiceMock();
    guard = new InternalUserBindingGuard(jwtServiceMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('answers 401 when the x-internal-token header is missing', async () => {
    const context = createLiveHttpContext({
      headers: {},
      body: { userId: 'user-1' },
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtServiceMock.verifyInternal).not.toHaveBeenCalled();
  });

  it('answers 401 when the header is not a single string', async () => {
    const context = createLiveHttpContext({
      headers: { 'x-internal-token': ['a', 'b'] },
      body: { userId: 'user-1' },
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('answers 401 when the token is invalid', async () => {
    jwtServiceMock.verifyInternal.mockRejectedValueOnce(new Error('jwt malformed'));
    const context = createLiveHttpContext({
      headers: { 'x-internal-token': 'bad-token' },
      body: { userId: 'user-1' },
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtServiceMock.verifyInternal).toHaveBeenCalledWith('bad-token');
  });

  it('answers 403 when the token belongs to another user than the PUT body userId', async () => {
    jwtServiceMock.verifyInternal.mockResolvedValueOnce(createJwtPayloadMock({ id: 'user-2' }));
    const context = createLiveHttpContext({
      headers: { 'x-internal-token': 'valid-token' },
      body: { userId: 'user-1' },
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('answers 403 when the token belongs to another user than the DELETE path userId', async () => {
    jwtServiceMock.verifyInternal.mockResolvedValueOnce(createJwtPayloadMock({ id: 'user-2' }));
    const context = createLiveHttpContext({
      headers: { 'x-internal-token': 'valid-token' },
      params: { eventId: 'event-1', userId: 'user-1' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('answers 403 when no target userId can be read (no body, no path parameter)', async () => {
    const context = createLiveHttpContext({
      headers: { 'x-internal-token': 'valid-token' },
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('answers 403 when the body userId is not a string', async () => {
    jwtServiceMock.verifyInternal.mockResolvedValueOnce(createJwtPayloadMock({ id: 'user-1' }));
    const context = createLiveHttpContext({
      headers: { 'x-internal-token': 'valid-token' },
      body: { userId: ['user-1'] },
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets the request through when the token identity matches the body userId (PUT)', async () => {
    jwtServiceMock.verifyInternal.mockResolvedValueOnce(createJwtPayloadMock({ id: 'user-1' }));
    const context = createLiveHttpContext({
      headers: { 'x-internal-token': 'valid-token' },
      body: { userId: 'user-1' },
      params: {},
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('lets the request through when the token identity matches the path userId (DELETE)', async () => {
    jwtServiceMock.verifyInternal.mockResolvedValueOnce(createJwtPayloadMock({ id: 'user-1' }));
    const context = createLiveHttpContext({
      headers: { 'x-internal-token': 'valid-token' },
      params: { eventId: 'event-1', userId: 'user-1' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
