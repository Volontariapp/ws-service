export interface ILiveCadenceRepository {
  /** Reserve le droit d'accepter une position ; faux si la derniere date de moins de 10 s. */
  tryAcquire(eventId: string, userId: string): Promise<boolean>;
}
