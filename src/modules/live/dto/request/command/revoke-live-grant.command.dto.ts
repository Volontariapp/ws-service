import { BadRequestException } from '@nestjs/common';
import { LIVE_ID_PATTERN } from '../../../live.constants.js';
import {
  LIVE_DEFAULT_REVOKE_REASON,
  isLiveRevokeReason,
  type LiveRevokeReason,
} from '../../../domain/live-revoke-reason.js';

export class RevokeLiveGrantCommandDTO {
  private constructor(
    readonly eventId: string,
    readonly userId: string,
    readonly reason: LiveRevokeReason,
  ) {}

  /**
   * Construit la commande depuis la requete DELETE : identifiants du chemin, puis raison lue dans
   * la query, a defaut dans le corps, a defaut `STOPPED`. Leve 400 si une valeur est invalide.
   */
  static fromRequest(
    eventId: string,
    userId: string,
    queryReason: unknown,
    body: unknown,
  ): RevokeLiveGrantCommandDTO {
    assertLiveId('eventId', eventId);
    assertLiveId('userId', userId);
    return new RevokeLiveGrantCommandDTO(eventId, userId, resolveReason(queryReason, body));
  }
}

const assertLiveId = (name: string, value: string): void => {
  if (!LIVE_ID_PATTERN.test(value)) {
    throw new BadRequestException(`${name} is not a valid identifier`);
  }
};

const readBodyReason = (body: unknown): unknown =>
  typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)['reason']
    : undefined;

const resolveReason = (queryReason: unknown, body: unknown): LiveRevokeReason => {
  const candidate = queryReason ?? readBodyReason(body);
  if (candidate === undefined) {
    return LIVE_DEFAULT_REVOKE_REASON;
  }
  if (!isLiveRevokeReason(candidate)) {
    throw new BadRequestException('reason must be one of ARRIVED, STOPPED, LEFT');
  }
  return candidate;
};
