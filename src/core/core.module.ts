import { Module } from '@nestjs/common';
import { SocketManagerService } from './services/socket-manager.service.js';

@Module({
  providers: [SocketManagerService],
  exports: [SocketManagerService],
})
export class CoreModule {}
