import { describe, expect, it } from '@jest/globals';
import { parseLivePositionCommand } from '../../../../../modules/live/dto/request/command/live-position.command.dto.js';
import {
  LIVE_EVENT_ID,
  createLivePositionPayload,
} from '../../../../helpers/factories/live.factory.js';

describe('parseLivePositionCommand (Unit)', () => {
  it('accepts a valid message', async () => {
    await expect(parseLivePositionCommand(createLivePositionPayload())).resolves.toMatchObject({
      eventId: LIVE_EVENT_ID,
      latitude: 48.8566,
      longitude: 2.3522,
    });
  });

  it('accepts the coordinate bounds', async () => {
    await expect(
      parseLivePositionCommand(createLivePositionPayload({ latitude: -90, longitude: 180 })),
    ).resolves.not.toBeNull();
  });

  it('keeps only the three expected fields', async () => {
    const command = await parseLivePositionCommand({
      ...createLivePositionPayload(),
      userId: 'user-from-payload',
    });

    expect(command).not.toHaveProperty('userId');
  });

  it.each([
    ['null', null],
    ['a string', 'live.position'],
    ['an array', [48.85, 2.35]],
    ['a missing eventId', { latitude: 48.85, longitude: 2.35 }],
    ['an empty eventId', createLivePositionPayload({ eventId: '' })],
    ['an eventId that could forge a key', createLivePositionPayload({ eventId: 'a:b' })],
    ['a numeric eventId', { ...createLivePositionPayload(), eventId: 12 }],
    ['a string latitude', { ...createLivePositionPayload(), latitude: '48.85' }],
    ['a string longitude', { ...createLivePositionPayload(), longitude: '2.35' }],
    ['a NaN latitude', createLivePositionPayload({ latitude: Number.NaN })],
    ['an infinite longitude', createLivePositionPayload({ longitude: Number.POSITIVE_INFINITY })],
    ['a latitude above 90', createLivePositionPayload({ latitude: 90.5 })],
    ['a latitude below -90', createLivePositionPayload({ latitude: -90.5 })],
    ['a longitude above 180', createLivePositionPayload({ longitude: 180.5 })],
    ['a longitude below -180', createLivePositionPayload({ longitude: -180.5 })],
  ])('rejects a message with %s', async (_label, body) => {
    await expect(parseLivePositionCommand(body)).resolves.toBeNull();
  });
});
