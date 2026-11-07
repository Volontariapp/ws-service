import { LIVE_GRANT_MAX_DURATION_MS } from '../live.constants.js';
import { GeoPoint } from './geo-point.value-object.js';

export interface LiveGrantProps {
  organizerId: string;
  eventPoint: GeoPoint;
  expiresAt: string;
}

export class LiveGrant {
  constructor(private readonly props: LiveGrantProps) {}

  get organizerId(): string {
    return this.props.organizerId;
  }

  get eventPoint(): GeoPoint {
    return this.props.eventPoint;
  }

  get expiresAt(): string {
    return this.props.expiresAt;
  }

  /** Motif de refus si l'expiration n'est pas dans le futur ou depasse 8 h, sinon null. */
  expiryViolation(nowMs: number): string | null {
    const expiresAtMs = Date.parse(this.expiresAt);
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= nowMs) {
      return 'expiresAt must be in the future';
    }
    if (expiresAtMs - nowMs > LIVE_GRANT_MAX_DURATION_MS) {
      return 'expiresAt must be at most 8 hours from now';
    }
    return null;
  }

  /** Duree de vie Redis en secondes, arrondie au-dessus, jamais inferieure a une seconde. */
  ttlSeconds(nowMs: number): number {
    return Math.max(1, Math.ceil((Date.parse(this.expiresAt) - nowMs) / 1000));
  }

  serialize(): string {
    return JSON.stringify({
      organizerId: this.organizerId,
      eventLatitude: this.eventPoint.latitude,
      eventLongitude: this.eventPoint.longitude,
      expiresAt: this.expiresAt,
    });
  }

  /** Relit une valeur stockee ; null si elle est illisible (echec ferme). */
  static parse(raw: string): LiveGrant | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const { organizerId, eventLatitude, eventLongitude, expiresAt } = parsed as Record<
      string,
      unknown
    >;
    if (
      typeof organizerId !== 'string' ||
      typeof expiresAt !== 'string' ||
      !GeoPoint.isValid(eventLatitude, eventLongitude)
    ) {
      return null;
    }
    return new LiveGrant({
      organizerId,
      eventPoint: GeoPoint.create(eventLatitude, eventLongitude),
      expiresAt,
    });
  }
}
