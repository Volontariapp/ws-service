import {
  BaseRepository,
  GatherStateModel,
  GatherStateEntity,
  type GatherEventState,
} from '@volontariapp/database';
import type { Repository } from 'typeorm';

export type GatherEventStatePatch = Pick<GatherEventState, 'status' | 'updatedAt'> &
  Pick<Partial<GatherEventState>, 'errorReason'>;

interface GatherStateRow {
  id: string;
  correlation_id: string;
  trigger_event: string;
  gather_events_state: Record<string, GatherEventState>;
  metadata: GatherStateEntity['metadata'] | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isGatherStateRow = (value: unknown): value is GatherStateRow =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.correlation_id === 'string' &&
  typeof value.trigger_event === 'string' &&
  isRecord(value.gather_events_state);

/**
 * `UPDATE ... RETURNING` through TypeORM's postgres driver resolves to
 * `[rows, affectedCount]`; older shapes resolve to the bare rows array.
 */
const extractRows = (result: unknown): unknown[] => {
  if (!Array.isArray(result)) return [];
  const [first] = result as unknown[];
  return Array.isArray(first) ? (first as unknown[]) : result;
};

export class GatherStateRepository extends BaseRepository<
  GatherStateModel,
  GatherStateEntity,
  string
> {
  constructor(repository: Repository<GatherStateModel>) {
    super(repository, GatherStateEntity, GatherStateModel);
  }

  /**
   * Atomically merges `patch` into one key of `gather_events_state`, in a
   * single statement. Postgres serializes concurrent UPDATEs of the same row
   * and re-evaluates the SET clause on the committed row, so concurrent
   * acknowledgements of the same gather never overwrite each other.
   *
   * The previous value of the key is kept (notably `eventType`), except
   * `errorReason`, which is replaced by the patch. Resolves to the row as
   * committed by this very statement, or `null` when the gather does not exist
   * or does not expect `eventKey`.
   */
  async setEventState(
    correlationId: string,
    eventKey: string,
    patch: GatherEventStatePatch,
  ): Promise<GatherStateEntity | null> {
    const result: unknown = await this.repository.query(
      `UPDATE "gather_state"
         SET "gather_events_state" = jsonb_set(
               "gather_events_state",
               ARRAY[$2]::text[],
               (COALESCE("gather_events_state" -> $2, '{}'::jsonb) - 'errorReason') || $3::jsonb,
               false
             ),
             "updated_at" = now()
       WHERE "correlation_id" = $1 AND "gather_events_state" ? $2
       RETURNING "id", "correlation_id", "trigger_event", "gather_events_state", "metadata"`,
      [correlationId, eventKey, JSON.stringify(patch)],
    );

    const [row] = extractRows(result);
    if (!isGatherStateRow(row)) return null;

    const entity = new GatherStateEntity();
    entity.id = row.id;
    entity.correlationId = row.correlation_id;
    entity.triggerEvent = row.trigger_event as GatherStateEntity['triggerEvent'];
    entity.gatherEventsState = row.gather_events_state;
    entity.metadata = row.metadata ?? undefined;
    return entity;
  }
}
