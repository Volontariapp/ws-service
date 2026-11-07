import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LiveWebsocketMessagingType } from '@volontariapp/messaging';
import type { NotificationService } from '../../../../../gateways/notification.service.js';
import { LiveNotifierService } from '../../../../../modules/live/services/live-notifier.service.js';
import {
  LIVE_EVENT_ID,
  LIVE_ORGANIZER_ID,
  LIVE_USER_ID,
  createLiveStoredPosition,
} from '../../../../helpers/factories/live.factory.js';
import { createNotificationServiceMock } from '../../../../helpers/mocks/notification.service.mock.js';

describe('LiveNotifierService (Unit)', () => {
  let notificationMock: jest.Mocked<NotificationService>;
  let notifier: LiveNotifierService;

  beforeEach(() => {
    notificationMock = createNotificationServiceMock();
    notifier = new LiveNotifierService(notificationMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends live.sharing_stopped with the event, the user and the reason', async () => {
    await notifier.notifySharingStopped(LIVE_ORGANIZER_ID, LIVE_EVENT_ID, LIVE_USER_ID, 'LEFT');

    expect(notificationMock.notifyUser).toHaveBeenCalledTimes(1);
    expect(notificationMock.notifyUser).toHaveBeenCalledWith(
      LIVE_ORGANIZER_ID,
      LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
      { eventId: LIVE_EVENT_ID, userId: LIVE_USER_ID, reason: 'LEFT' },
    );
  });

  it('sends live.positions_updated with a single position and nothing else', async () => {
    const position = createLiveStoredPosition();

    await notifier.notifyPositionUpdated(LIVE_ORGANIZER_ID, LIVE_EVENT_ID, LIVE_USER_ID, position);

    expect(notificationMock.notifyUser).toHaveBeenCalledTimes(1);
    expect(notificationMock.notifyUser).toHaveBeenCalledWith(
      LIVE_ORGANIZER_ID,
      LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED,
      {
        eventId: LIVE_EVENT_ID,
        positions: [
          {
            userId: LIVE_USER_ID,
            latitude: position.latitude,
            longitude: position.longitude,
            updatedAt: position.updatedAt,
          },
        ],
      },
    );
  });
});
