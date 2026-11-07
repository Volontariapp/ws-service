import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LiveWebsocketMessagingType } from '@volontariapp/messaging';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@volontariapp/auth';
import request from 'supertest';
import { NotificationService } from '../../../../../gateways/notification.service.js';
import { LiveGrantInternalController } from '../../../../../modules/live/controllers/live-grant.internal.controller.js';
import { InternalUserBindingGuard } from '../../../../../modules/live/guards/internal-user-binding.guard.js';
import { LIVE_GRANT_REPOSITORY } from '../../../../../modules/live/live.constants.js';
import type { ILiveGrantRepository } from '../../../../../modules/live/repositories/interfaces/live-grant.repository.js';
import { LiveGrantService } from '../../../../../modules/live/services/live-grant.service.js';
import { LiveNotifierService } from '../../../../../modules/live/services/live-notifier.service.js';
import { createJwtPayloadMock } from '../../../../helpers/factories/jwt-payload.factory.js';
import {
  LIVE_EVENT_ID,
  LIVE_NOW_MS,
  LIVE_USER_ID,
  createLiveGrant,
  createLiveGrantRequest,
} from '../../../../helpers/factories/live.factory.js';
import { createJwtServiceMock } from '../../../../helpers/mocks/jwt.service.mock.js';
import { createLiveGrantRepositoryMock } from '../../../../helpers/mocks/live-grant.repository.mock.js';
import { createNotificationServiceMock } from '../../../../helpers/mocks/notification.service.mock.js';

/** Route reelle (garde, pipe, codes HTTP, service) sans Redis ni base. */
describe('/internal/live over HTTP (Unit)', () => {
  let app: INestApplication;
  let jwtServiceMock: jest.Mocked<JwtService>;
  let grantRepositoryMock: jest.Mocked<ILiveGrantRepository>;
  let notificationMock: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    jwtServiceMock = createJwtServiceMock();
    grantRepositoryMock = createLiveGrantRepositoryMock();
    notificationMock = createNotificationServiceMock();
    jwtServiceMock.verifyInternal.mockResolvedValue(createJwtPayloadMock({ id: LIVE_USER_ID }));
    jest.spyOn(Date, 'now').mockReturnValue(LIVE_NOW_MS);

    const moduleRef = await Test.createTestingModule({
      controllers: [LiveGrantInternalController],
      providers: [
        InternalUserBindingGuard,
        LiveGrantService,
        LiveNotifierService,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: LIVE_GRANT_REPOSITORY, useValue: grantRepositoryMock },
        { provide: NotificationService, useValue: notificationMock },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('PUT without token answers 401 and writes nothing', async () => {
    await request(app.getHttpServer())
      .put('/internal/live/grants')
      .send(createLiveGrantRequest())
      .expect(401);
    expect(grantRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('PUT with the token of another user answers 403 and writes nothing', async () => {
    await request(app.getHttpServer())
      .put('/internal/live/grants')
      .set('x-internal-token', 'valid')
      .send(createLiveGrantRequest({ userId: 'someone-else' }))
      .expect(403);
    expect(grantRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('PUT with a valid body answers 204 and reaches the repository', async () => {
    const body = createLiveGrantRequest();

    await request(app.getHttpServer())
      .put('/internal/live/grants')
      .set('x-internal-token', 'valid')
      .send(body)
      .expect(204);

    expect(grantRepositoryMock.save).toHaveBeenCalledWith(
      LIVE_EVENT_ID,
      LIVE_USER_ID,
      createLiveGrant(),
      7200,
    );
  });

  it('PUT with coordinates out of bounds answers 400 and writes nothing', async () => {
    await request(app.getHttpServer())
      .put('/internal/live/grants')
      .set('x-internal-token', 'valid')
      .send(createLiveGrantRequest({ eventLatitude: 91 }))
      .expect(400);
    expect(grantRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('PUT with an unknown property answers 400', async () => {
    await request(app.getHttpServer())
      .put('/internal/live/grants')
      .set('x-internal-token', 'valid')
      .send({ ...createLiveGrantRequest(), extra: true })
      .expect(400);
  });

  it('DELETE with the token of another user answers 403 and removes nothing', async () => {
    await request(app.getHttpServer())
      .delete(`/internal/live/grants/${LIVE_EVENT_ID}/someone-else`)
      .set('x-internal-token', 'valid')
      .expect(403);
    expect(grantRepositoryMock.removeWithAssociatedData).not.toHaveBeenCalled();
  });

  it('DELETE answers 204 and forwards the reason of the query string', async () => {
    grantRepositoryMock.removeWithAssociatedData.mockResolvedValueOnce(createLiveGrant());

    await request(app.getHttpServer())
      .delete(`/internal/live/grants/${LIVE_EVENT_ID}/${LIVE_USER_ID}?reason=ARRIVED`)
      .set('x-internal-token', 'valid')
      .expect(204);

    expect(notificationMock.notifyUser).toHaveBeenCalledWith(
      'organizer-1',
      LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
      { eventId: LIVE_EVENT_ID, userId: LIVE_USER_ID, reason: 'ARRIVED' },
    );
  });

  it('DELETE answers 204 when the grant no longer exists', async () => {
    await request(app.getHttpServer())
      .delete(`/internal/live/grants/${LIVE_EVENT_ID}/${LIVE_USER_ID}`)
      .set('x-internal-token', 'valid')
      .expect(204);
    expect(notificationMock.notifyUser).not.toHaveBeenCalled();
  });

  it('DELETE with a forbidden reason answers 400', async () => {
    await request(app.getHttpServer())
      .delete(`/internal/live/grants/${LIVE_EVENT_ID}/${LIVE_USER_ID}?reason=REVOKED`)
      .set('x-internal-token', 'valid')
      .expect(400);
    expect(grantRepositoryMock.removeWithAssociatedData).not.toHaveBeenCalled();
  });
});
