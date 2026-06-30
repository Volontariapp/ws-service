import { BaseRepository, GatherStateModel, GatherStateEntity } from '@volontariapp/database';
import type { Repository } from 'typeorm';

export class GatherStateRepository extends BaseRepository<
  GatherStateModel,
  GatherStateEntity,
  string
> {
  constructor(repository: Repository<GatherStateModel>) {
    super(repository, GatherStateEntity, GatherStateModel);
  }
}
