import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PutLiveGrantCommandDTO } from '../../../../../modules/live/dto/request/command/put-live-grant.command.dto.js';
import { createLiveGrantRequest } from '../../../../helpers/factories/live.factory.js';

const validationErrorsFor = async (input: object): Promise<string[]> => {
  const errors = await validate(plainToInstance(PutLiveGrantCommandDTO, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((error) => error.property);
};

describe('PutLiveGrantCommandDTO (Unit)', () => {
  it('accepts a valid body', async () => {
    await expect(validationErrorsFor(createLiveGrantRequest())).resolves.toEqual([]);
  });

  it.each(['eventId', 'userId', 'organizerId'] as const)('rejects an empty %s', async (field) => {
    await expect(validationErrorsFor(createLiveGrantRequest({ [field]: '' }))).resolves.toEqual([
      field,
    ]);
  });

  it('rejects identifiers that could forge a Redis key', async () => {
    await expect(
      validationErrorsFor(createLiveGrantRequest({ eventId: 'event-1:user-9' })),
    ).resolves.toEqual(['eventId']);
  });

  it.each([
    ['latitude above 90', { eventLatitude: 90.1 }, 'eventLatitude'],
    ['latitude below -90', { eventLatitude: -90.1 }, 'eventLatitude'],
    ['longitude above 180', { eventLongitude: 180.1 }, 'eventLongitude'],
    ['longitude below -180', { eventLongitude: -180.1 }, 'eventLongitude'],
    ['non finite latitude', { eventLatitude: Number.NaN }, 'eventLatitude'],
  ])('rejects %s', async (_label, override, property) => {
    await expect(validationErrorsFor(createLiveGrantRequest(override))).resolves.toEqual([
      property,
    ]);
  });

  it('rejects coordinates sent as strings', async () => {
    await expect(
      validationErrorsFor({ ...createLiveGrantRequest(), eventLatitude: '48.85' }),
    ).resolves.toEqual(['eventLatitude']);
  });

  it('accepts the coordinate bounds', async () => {
    await expect(
      validationErrorsFor(createLiveGrantRequest({ eventLatitude: -90, eventLongitude: 180 })),
    ).resolves.toEqual([]);
  });

  it('rejects a non ISO 8601 expiresAt', async () => {
    await expect(
      validationErrorsFor(createLiveGrantRequest({ expiresAt: '07/11/2026 14:00' })),
    ).resolves.toEqual(['expiresAt']);
  });

  it('rejects unknown properties', async () => {
    await expect(
      validationErrorsFor({ ...createLiveGrantRequest(), role: 'ADMIN' }),
    ).resolves.toEqual(['role']);
  });
});
