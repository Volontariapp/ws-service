import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LiveWebsocketMessagingType } from '@volontariapp/messaging';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@volontariapp/auth';
import request from 'supertest';
import { NotificationService } from '../../../gateways/notification.service.js';
import { LiveGrantService } from '../../../live/live-grant.service.js';
import { LiveInternalController } from '../../../live/live-internal.controller.js';
import { LiveInternalGuard } from '../../../live/live-internal.guard.js';
import { createJwtPayloadMock } from '../../helpers/factories/jwt-payload.factory.js';
import {
  LIVE_EVENT_ID,
  LIVE_USER_ID,
  createLiveGrant,
  createLiveGrantRequest,
} from '../../helpers/factories/live.factory.js';
import { createJwtServiceMock } from '../../helpers/mocks/jwt.service.mock.js';
import { createLiveGrantServiceMock } from '../../helpers/mocks/live-grant.service.mock.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';

/** Route reelle (garde, pipe, codes HTTP) sans Redis ni base. */
describe('/internal/live over HTTP (Unit)', () => {
  let app: INestApplication;
  let jwtServiceMock: jest.Mocked<JwtService>;
  let grantServiceMock: jest.Mocked<LiveGrantService>;
  let notificationMock: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    jwtServiceMock = createJwtServiceMock();
    grantServiceMock = createLiveGrantServiceMock();
    notificationMock = createNotificationServiceMock();
    jwtServiceMock.verifyInternal.mockResolvedValue(createJwtPayloadMock({ id: LIVE_USER_ID }));

    const moduleRef = await Test.createTestingModule({
      controllers: [LiveInternalController],
      providers: [
        LiveInternalGuard,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: LiveGrantService, useValue: grantServiceMock },
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
    expect(grantServiceMock.grant).not.toHaveBeenCalled();
  });

  it('PUT with the token of another user answers 403 and writes nothing', async () => {
    await request(app.getHttpServer())
      .put('/internal/live/grants')
      .set('x-internal-token', 'valid')
      .send(createLiveGrantRequest({ userId: 'someone-else' }))
      .expect(403);
    expect(grantServiceMock.grant).not.toHaveBeenCalled();
  });

  it('PUT with a valid body answers 204 and reaches the service', async () => {
    const body = createLiveGrantRequest();

    await request(app.getHttpServer())
      .put('/internal/live/grants')
      .set('x-internal-token', 'valid')
      .send(body)
      .expect(204);

    expect(grantServiceMock.grant).toHaveBeenCalledWith(body);
  });

  it('PUT with coordinates out of bounds answers 400 and writes nothing', async () => {
    await request(app.getHttpServer())
      .put('/internal/live/grants')
      .set('x-internal-token', 'valid')
      .send(createLiveGrantRequest({ eventLatitude: 91 }))
      .expect(400);
    expect(grantServiceMock.grant).not.toHaveBeenCalled();
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
    expect(grantServiceMock.revoke).not.toHaveBeenCalled();
  });

  it('DELETE answers 204 and forwards the reason of the query string', async () => {
    grantServiceMock.revoke.mockResolvedValueOnce(createLiveGrant());

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
    expect(grantServiceMock.revoke).not.toHaveBeenCalled();
  });
});
