import type { MaskingConfig } from '@volontariapp/logger';

/** Rayon de repli (metres) : sous ce seuil, le serveur arrete le partage (D17). */
export const LIVE_ARRIVAL_FALLBACK_RADIUS_M = 150;

/** Duree de vie (secondes) de la derniere position connue. */
export const LIVE_POSITION_TTL_S = 120;

/** Cadence minimale (millisecondes) entre deux positions acceptees pour un meme couple. */
export const LIVE_MIN_UPDATE_INTERVAL_MS = 10_000;

/** Decimales conservees par le serveur (cellule d'environ 110 m). */
export const LIVE_COORDINATE_DECIMALS = 3;

/** Duree maximale d'une autorisation (millisecondes), revérifiee cote serveur (D18). */
export const LIVE_GRANT_MAX_DURATION_MS = 8 * 60 * 60 * 1000;

/** Identifiants acceptes dans les cles Redis : pas de `:` ni d'espace (pas d'injection de cle). */
export const LIVE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** Cles de journal a masquer (recherche par fragment, insensible a la casse). Jamais `lat` seul. */
export const LIVE_LOG_MASKING: MaskingConfig = { keys: ['latitude', 'longitude'] };

export const liveGrantKey = (eventId: string, userId: string): string =>
  `live:grant:${eventId}:${userId}`;

export const livePositionKey = (eventId: string, userId: string): string =>
  `live:pos:${eventId}:${userId}`;

/** Cle de cadence : posee en SET NX PX, donc atomique entre plusieurs messages concurrents. */
export const liveRateKey = (eventId: string, userId: string): string =>
  `live:rate:${eventId}:${userId}`;
