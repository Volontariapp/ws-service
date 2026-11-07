import type { ILivePositionClientPayload } from '@volontariapp/messaging';
import { plainToInstance } from 'class-transformer';
import { IsNumber, Matches, Max, Min, validate } from 'class-validator';
import { LIVE_ID_PATTERN, LIVE_MAX_LATITUDE, LIVE_MAX_LONGITUDE } from '../../../live.constants.js';

export class LivePositionCommandDTO implements ILivePositionClientPayload {
  @Matches(LIVE_ID_PATTERN)
  eventId!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-LIVE_MAX_LATITUDE)
  @Max(LIVE_MAX_LATITUDE)
  latitude!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-LIVE_MAX_LONGITUDE)
  @Max(LIVE_MAX_LONGITUDE)
  longitude!: number;
}

/**
 * Valide un message `live.position` recu du client (types et bornes). Ne conserve que les trois
 * champs attendus : tout le reste du message est ignore. Renvoie null si le message est invalide.
 */
export const parseLivePositionCommand = async (
  body: unknown,
): Promise<LivePositionCommandDTO | null> => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }
  const { eventId, latitude, longitude } = body as Record<string, unknown>;
  const command = plainToInstance(LivePositionCommandDTO, { eventId, latitude, longitude });
  const errors = await validate(command);
  return errors.length === 0 ? command : null;
};
