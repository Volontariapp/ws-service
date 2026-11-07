import type { LiveGrant } from '../../domain/live-grant.entity.js';

export interface ILiveGrantRepository {
  /** Ecrit l'autorisation, qui expire seule apres `ttlSeconds`. */
  save(eventId: string, userId: string, grant: LiveGrant, ttlSeconds: number): Promise<void>;

  /** Autorisation courante, ou null si absente ou illisible. */
  find(eventId: string, userId: string): Promise<LiveGrant | null>;

  /**
   * Retire l'autorisation avec la derniere position et la cle de cadence, et renvoie
   * l'autorisation retiree (null si elle n'existait plus).
   */
  removeWithAssociatedData(eventId: string, userId: string): Promise<LiveGrant | null>;
}
