import { IsISO8601, IsNumber, Matches, Max, Min } from 'class-validator';
import type { ILiveGrantRequest } from '@volontariapp/messaging';
import { LIVE_ID_PATTERN } from '../live.constants.js';

const ID_MESSAGE = 'must be a non-empty identifier (letters, digits, "-" and "_")';

export class PutLiveGrantDto implements ILiveGrantRequest {
  @Matches(LIVE_ID_PATTERN, { message: `eventId ${ID_MESSAGE}` })
  eventId!: string;

  @Matches(LIVE_ID_PATTERN, { message: `userId ${ID_MESSAGE}` })
  userId!: string;

  @Matches(LIVE_ID_PATTERN, { message: `organizerId ${ID_MESSAGE}` })
  organizerId!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  eventLatitude!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  eventLongitude!: number;

  @IsISO8601({ strict: true, strictSeparator: true })
  expiresAt!: string;
}
