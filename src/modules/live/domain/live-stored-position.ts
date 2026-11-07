/** Valeur stockee sous `live:pos:{eventId}:{userId}` (coordonnees deja arrondies). */
export interface LiveStoredPosition {
  latitude: number;
  longitude: number;
  updatedAt: string;
}
