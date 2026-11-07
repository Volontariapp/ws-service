import { IsISO8601, IsNumber, Matches, Max, Min } from 'class-validator';
import type { ILiveGrantRequest } from '@volontariapp/messaging';
import { LIVE_ID_PATTERN, LIVE_MAX_LATITUDE, LIVE_MAX_LONGITUDE } from '../../../live.constants.js';

const ID_MESSAGE = 'must be a non-empty identifier (letters, digits, "-" and "_")';

export class PutLiveGrantCommandDTO implements ILiveGrantRequest {
  @Matches(LIVE_ID_PATTERN, { message: `eventId ${ID_MESSAGE}` })
  eventId!: string;

  @Matches(LIVE_ID_PATTERN, { message: `userId ${ID_MESSAGE}` })
  userId!: string;

  @Matches(LIVE_ID_PATTERN, { message: `organizerId ${ID_MESSAGE}` })
  organizerId!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-LIVE_MAX_LATITUDE)
  @Max(LIVE_MAX_LATITUDE)
  eventLatitude!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-LIVE_MAX_LONGITUDE)
  @Max(LIVE_MAX_LONGITUDE)
  eventLongitude!: number;

  @IsISO8601({ strict: true, strictSeparator: true })
  expiresAt!: string;
}
