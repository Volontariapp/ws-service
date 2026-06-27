import { Module } from '@nestjs/common';
import { SocketManagerService } from './services/socket-manager.service.js';
import { GatherStateService } from './services/gather-state.service.js';
import { GatherStateRepository } from './repositories/gather-state.repository.js';
import { AppDataSource } from '../config/data-source.js';
import { GatherStateModel } from '@volontariapp/database';

@Module({
  providers: [
    SocketManagerService,
    GatherStateService,
    {
      provide: GatherStateRepository,
      useFactory: () => {
        return new GatherStateRepository(AppDataSource.getRepository(GatherStateModel));
      },
    },
  ],
  exports: [SocketManagerService, GatherStateService, GatherStateRepository],
})
export class CoreModule {}
