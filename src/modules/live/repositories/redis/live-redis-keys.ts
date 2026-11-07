export const liveGrantKey = (eventId: string, userId: string): string =>
  `live:grant:${eventId}:${userId}`;

export const livePositionKey = (eventId: string, userId: string): string =>
  `live:pos:${eventId}:${userId}`;

/** Cle de cadence : posee en SET NX PX, donc atomique entre plusieurs messages concurrents. */
export const liveRateKey = (eventId: string, userId: string): string =>
  `live:rate:${eventId}:${userId}`;
