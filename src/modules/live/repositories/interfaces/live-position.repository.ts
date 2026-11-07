import type { LiveStoredPosition } from '../../domain/live-stored-position.js';

export interface ILivePositionRepository {
  save(eventId: string, userId: string, position: LiveStoredPosition): Promise<void>;
}
